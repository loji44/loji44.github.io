---
layout: post
title: Redis持久化之rdb和aof
date: 2020-06-01 20:14:31.000000000 +08:00
tags: 
  - Redis
---

Redis虽然是内存数据库，但是为了一定程度的数据可靠性也做了一些持久化的方案，确保Redis机器宕机或者断电重启之后，能从备份数据中恢复宕机、掉电前的数据。

Redis目前有两种持久化方案：RDB持久化和AOF持久化。

### 1. Redis RDB持久化

RDB全称是Redis DataBase。是Redis最早支持的一种持久化方式，也是Redis默认的持久化方案。

RDB持久化是一种生成「快照」数据的方式，它会根据配置文件（`redis.conf`）中的持久化策略在合适的时机自动去dump整个Redis服务器在「某个时刻」的中的全量内存数据，即某个时刻的快照数据。并将快照数据保存在一个名叫`dump.rdb`的文件中，这些快照数据以二进制格式压缩存储。

##### 1.1 RDB持久化策略配置

我们可以在Redis服务器的配置文件中以`save`指令配置RDB持久化策略，如下所示：

```text
# redis.conf
# save <seconds> <changes>

save 900 1     # 900秒（15分钟）内，如果至少有一个key被更改则触发RDB
save 300 10    # 300秒（5分钟）内，如果至少有一个key被更改则触发RDB
save 60 10000  # 60秒内，如果至少发生10000个key被更改则触发RDB
```

如果想关闭RDB持久化，只需要将配置文件中的save配置项改成：`save ""`即可：

```text
# redis.conf
# save <seconds> <changes>

save ""  # save "" 表示关闭RDB持久化
```

##### 1.2 RDB持久化手动触发执行

写在redis.conf文件中的`save <seconds> <changes>`配置项可以让Redis自动触发RDB持久化。但是有时候我们也可能需要手动触发一下RDB持久化，这时候可以使用以下两条Redis命令：

- `SAVE`：SAVE命令直接在当前Redis进程中执行RDB持久化操作，会阻塞掉来自客户端的所有请求，直到RDB持久化完成。**生产环境慎用！**
- `BGSAVE`：BGSAVE命令会调用fork创建一个子进程来进行RDB持久化操作。fork完毕之后，子进程会在后台进行RDB持久化，不会影响Redis主进程处理客户端的请求。

>生产环境手动触发RDB持久化，首选BGSAVE命令。若BGSAVE产生的后台子进程出现问题时，则可以考虑用SAVE命令来兜底。

##### 1.3 RDB快照数据的恢复

Redis启动时，若发现数据目录下有`dump.rdb`文件就会自动加载该文件中的数据内容到内存中。

![rdb-load.png](/static/image/2020/rdb-load.png)

`dump.rdb`记录的就是某个时刻Redis服务器内存中的全量物理数据，并以二进制格式压缩存储。所以加载到内存也就完成了数据的恢复。

##### 1.4 RDB持久化方式总结

RDB持久化方式关注点在于**快照数据**，每次触发RDB持久化都是全量保存某个时间点上的所有内存数据。就这一点而言，它很适合备份场景，用于灾难恢复。它有如下优点：

- RDB持久化生成的`dump.rdb`文件是一个经过压缩的紧凑的二进制文件，加载/恢复速度很快。

RDB持久化也有缺点：

- 没法做到实时/秒级持久化，因为每次RDB持久化都会fork一个子进程来生成快照数据，fork属于重量级操作，频繁fork会让cpu和内存吃不消，影响Redis性能。

### 2. Redis AOF持久化

Redis `v1.1`开始支持另一种持久化方式：AOF（`Append-only File`）。相比RDB持久化记录物理数据的方式，AOF文件记录的不是物理数据，而是记录Redis中的每条**写命令**，例如`SET`，`DEL`等。每当有写操作发生，这个写操作的命令会被追加到AOF文件中：`appendonly.aof`。

我们可以这么理解：RDB记录的是物理日志，AOF记录的是逻辑日志，是一条条Redis写操作命令。

>这个有点类似MySQL中的redo log和binlog。redo log记录的也是物理日志，binlog记录的是一条条SQL，是逻辑日志。

##### 2.1 AOF持久化策略配置

Redis默认不开启AOF持久化，我们需要在`redis.conf`配置文件中配置`appendonly yes`来开启：

```text
# redis.conf
appendonly yes        # yes表示开启AOF持久化；no表示关闭AOF持久化
appendfsync everysec  # AOF持久化策略：no、always、everysec
```

`appendfsync`参数对Redis的性能有着重要的影响：

- `always`：每次写操作都会调用fsync将写操作命令同步到磁盘的`appendonly.aof`文件中，这种方式性能最差，但是数据可靠性最强；
- `no`：每次Redis写操作后不会主动调用fsync同步到磁盘，只是写入缓冲区，由操作系统内核自动将缓冲区数据持久化到磁盘。Linux内核默认以每「30秒/次」的频率将文件缓冲区的数据刷新到磁盘。这种方式性能最好，但是数据可靠性最差；
- `everysec`：everysec是权衡了性能和数据可靠性之后的一种折衷方式，即由Redis后台线程每秒调用fsync将缓冲区数据持久化到磁盘。这种方式兼顾了性能和数据的可靠性，是AOF默认的配置方式。采用这种方式，遇到宕机或者掉电我们最多丢失1秒的数据。

##### 2.2 AOF数据的加载恢复

如果同时开启RDB和AOF持久化，即数据目录中会同时存在`dump.rdb`和`appendonly.aof`文件，Redis在启动的时候会优先使用`appendonly.aof`来恢复数据，因为从AOF文件中恢复的数据集是最完整也是最新的。同样，在启动日志中体现了AOF文件的加载：

![aof-load.png](/static/image/2020/aof-load.png)

不像RDB数据的恢复，直接load到内存即可。AOF的恢复需要读取`appendonly.aof`文件并逐条执行该文件中记录的每一条Redis命令来达到重建整个数据集的目的。如果数据集很大，那么AOF的恢复会比RDB慢很多。

`appendonly.aof`文件只是一个文本文件，里面记录着每次Redis的写操作命令。

例如我执行`SET test_key hello`之后，查看`appendonly.aof`文件内容如下所示：

```text
*2
$6
SELECT
$1
0
*3
$3
SET
$8
test_key
$5
hello
```

|字符|含义|
|:---|:---|
|*3|表示此条Redis命令包含3个参数|
|$3|表示第一个参数的长度为3，即`SET`占用3个字符|
|$8|表示第二个参数的长度为8，即`test_key`占用8个字符|
|$5|表示第三个参数的长度为5，即`hello`占用5个字符|

现在我执行一个删除操作，删除刚才的key：`DEL test_key`，此时`appendonly.aof`文件内容：

```text
*2
$6
SELECT
$1
0
*3
$3
SET
$8
test_key
$5
hello
*2
$6
SELECT
$1
0
*2
$3
DEL
$8
test_key
```

发现AOF文件除了记录我们之前的`SET`，也记录了我们的`DEL`写操作命令，这就是`Append-only`，所有的写操作命令只是追加到AOF文件中。所以当Redis宕机重启之后，加载`appendonly.aof`文件执行里面的一条条写操作命令之后，得到的数据集就是Redis宕机前的数据集，从而恢复数据。

若设置一个自动过期的key，AOF文件会怎样记录？例如：`SET ttl_key ttl_value EX 300`，设置`ttl_key`的过期时间为5分钟，查看`appendonly.aof`文件：

```text
*3
$9
PEXPIREAT
$7
ttl_key
$13
1591017706735
```

`SET ttl_key ttl_value EX 300`命令会被转换成另一种形式记录在`appendonly.aof`文件中，变成了`PEXPIREAT ttl_key 1591017706735`。这很合理，因为当重启恢复数据后，Redis重新构建这条数据的时候可能已经过期，也就会自动删除；如果AOF不做转换而是原样记录写操作命令，那么当恢复数据的时候，就有可能会产生数据不一致。

##### 2.3 AOF日志重写机制

`appendonly.aof`只是一个文本文件，而且Redis写操作命令会不断地追加到文件尾部。随着时间的推移，`appendonly.aof`文件的体积会越来越大，宕机重启恢复数据时，耗时也会越来越大。所以才有了AOF日志的重写机制。

所谓AOF日志重写，就是将`appendonly.aof`文件中的多条指令操作合并成一条指令的操作，节省存储空间，也节省启动恢复数据的耗时。例如，多次对同一个key执行`INCR`操作，AOF文件中也会依次记录多次`INCR`。通过AOF日志重写，针对这个key的`INCR`操作可以合并成一个`SET`操作：100次`INCR count_key`可以重写成一次`SET count_key 100`。

AOF日志重写能保证AOF日志文件数据的安全，如何实现数据安全呢？原理如下图所示：

![aof-rewrite-flow.png](/static/image/2020/aof-rewrite-flow.png)

- 主进程执行fork操作，创建一个子进程；
- 子进程遍历内存中的数据，转换成写操作命令并写入一个临时文件；
- 客户端的实时写命令请求，主进程还是会持久化到原来的AOF文件，**同时也将写命令写入一个AOF重写内存缓存中**，这样即使在重写过程中发生宕机，也能确保原来的AOF文件是安全的；
- 子进程重写完毕，给主进程发送一个通知；主进程收到通知后，将**AOF内存缓存**中的写操作命令追加到这个AOF临时文件中；
- Redis原子地将AOF临时文件重命名为`appendonly.aof`，替换原AOF文件，完成！

如何触发AOF日志重写呢？

**(1) 手动触发AOF日志重写**

在Redis `v2.4`之前，只能通过`BGREWRITEAOF`命令手动触发AOF日志重写。

![aof-rewrite.png](/static/image/2020/aof-rewrite.png)

查看`appendonly.aof`文件发现重写之后，文件出现了`REDIS0009ú redis-ver^E5.0.5ú`字符，跟`dump.rdb`中的字符一样，说明AOF重写会对文件内容进行压缩存储。

**(2) `redis.conf`配置AOF自动重写策略**

Redis `v2.4`及之后的版本可以通过配置文件来配置AOF日志自动重写的策略。

```text
# redis.conf
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

- `auto-aof-rewrite-percentage`：Redis会记录上一次AOF重写之后的文件大小（如果没有执行过AOF重写，那么以Redis重启后AOF文件大小为基准），如果发现AOF文件当前大小大于上一次文件大小的指定百分比，例如上一次重写之后文件大小为`100MB`，指定百分比为`100%`，那么当前文件大小大于`100MB + 100MB*100% = 200MB`的时候，就会触发AOF重写；
- `auto-aof-rewrite-min-size`：这个参数是指定触发AOF重写的AOF文件大小的最小值，超过这个值才会触发AOF重写；如果AOF文件大小小于这个值，就算超过了`auto-aof-rewrite-percentage`百分比，也不会触发重写。

##### 2.4 AOF日志文件损坏怎么办？

Redis在运行过程中可能会遇到突发的宕机、停电，如果这时候正在写AOF文件，就有可能没写完成，发生文件损坏（corrupt）。Redis在重启之后，发现AOF文件损坏会拒绝加载这个AOF文件。这个时候可以这样做：

- 先为现有的AOF文件创建一个备份，备份很重要；
- 使用Redis自带的程序工具`redis-check-aof`对损坏的AOF文件进行修复：`redis-check-aof --fix appendonly.aof`；
- （可选）使用`diff -u`对比修复后的文件和原始文件的备份，查看两个文件之间的不同之处；
- 重启Redis，等待Redis重新加载AOF文件进行数据恢复。

##### 2.5 AOF持久化方式总结

AOF持久化保存的是一种逻辑日志，即记录的是一条条写操作的命令，而不是像RDB持久化那样记录物理数据。它在恢复数据的时候，是直接执行AOF文件中的一条条Redis命令来重建整个数据集的。

AOF持久化的优点：

- 能够做到实时/秒级别的持久化，数据的实时性更好。

AOF持久化优点：

- AOF文件体积会比RDB大，如果数据集很大，AOF重写和AOF文件加载/恢复都将是一个很耗资源和耗时的操作。

### 3. 写在最后

Redis的两种持久化方式各有特色，我们生产环境一般不会只用其中一种，而是同时使用两种。

例如RDB可以结合`cron`定时任务去定期生成备份数据，用于灾难恢复；同时，AOF因为支持实时持久化，它记录的数据集是最实时的，所以我们也会同时开启AOF持久化，应对一些对数据实时完整性要求较高的场景。但是AOF也可能会损坏无法修复，所以两种方式并用对数据才是最安全的。

<hr />