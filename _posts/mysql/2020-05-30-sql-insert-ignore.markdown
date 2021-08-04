---
layout: post
title: MySQL INSERT IGNORE INTO
date: 2020-05-30 11:44:51.000000000 +08:00
tags: 
 - MySQL
---

开发中经常会一次性往一个里INSERT多条数据，但是当某条INSERT SQL因为与表中发生**主键冲突**，或者与某个定义为`UNIQUE KEY`的字段发生`Duplicate entry`错误时，MySQL会放弃执行后续的INSERT SQL。而我们希望如果某条INSERT发生了唯一性约束的错误，那么这条INSERT不插入数据即可，不要影响后面的其他INSERT语句的执行。

### 1. 需求描述

有张表的结构如下所示：

```sql
CREATE TABLE `my_user` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '自增ID',
  `nickname` varchar(10) DEFAULT NULL COMMENT '用户昵称',
  `mobile` varchar(11) DEFAULT NULL COMMENT '手机号码',
  `email` varchar(100) DEFAULT NULL COMMENT '邮箱地址',
  `address` varchar(200) DEFAULT NULL COMMENT '居住地址',
  `age` tinyint(3) unsigned DEFAULT NULL COMMENT '用户年龄',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_nickname` (`nickname`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='用户表';
```

>id字段为主键；在nickname字段处创建了唯一索引。

当往表里一次性插入多条数据，前两条数据数据的id值都为1：

```sql
INSERT INTO my_user (id, nickname, mobile, email, address, age) VALUES (1, 'zhangsan', '17777778901', 'zhangsan@foxmail.com', 'Beijing', 18);
INSERT INTO my_user (id, nickname, mobile, email, address, age) VALUES (1, 'lisi', '16688990101', 'lisi@foxmail.com', 'Hangzhou', 28);
INSERT INTO my_user (id, nickname, mobile, email, address, age) VALUES (2, 'wangwu', '155784983939', 'wangwu@foxmail.com', 'Guangxi', 20);
```

会出现主键冲突错误：

>ERROR 1062 (23000): Duplicate entry '1' for key 'PRIMARY'

同样，往表里一次性插入多条数据，前面两条数据的nickname都为`zhangsan`。需要注意的是，nickname字段是有唯一索引约束的。

```sql
INSERT INTO my_user (nickname, mobile, email, address, age) VALUES ('zhangsan', '17777778901', 'zhangsan@foxmail.com', 'Beijing', 18);
INSERT INTO my_user (nickname, mobile, email, address, age) VALUES ('zhangsan', '16688990101', 'lisi@foxmail.com', 'Hangzhou', 28);
INSERT INTO my_user (nickname, mobile, email, address, age) VALUES ('wangwu', '155784983939', 'wangwu@foxmail.com', 'Guangxi', 20);
```

同样也会出现唯一性约束错误：

>ERROR 1062 (23000): Duplicate entry 'zhangsan' for key 'uk_username'

以上两种出现唯一性约束错误之后，MySQL就不会执行后续的INSERT SQL，例如上面的`wangwu`就不会被执行。在批量执行INSERT SQL时，如何忽略某些INSERT操作发生的唯一性约束异常，而不影响后续的INSERT SQL的执行呢？这里记录两种实现方式。

### 2. 使用`INSERT IGNORE INTO`

>`IGNORE`子句是MySQL对SQL标准的扩展。

```sql
INSERT IGNORE INTO my_user (nickname, mobile, email, address, age) VALUES ('zhangsan', '17777778901', 'zhangsan@foxmail.com', 'Beijing', 18);
INSERT IGNORE INTO my_user (nickname, mobile, email, address, age) VALUES ('zhangsan', '16688990101', 'lisi@foxmail.com', 'Hangzhou', 28);
INSERT IGNORE INTO my_user (nickname, mobile, email, address, age) VALUES ('wangwu', '155784983939', 'wangwu@foxmail.com', 'Guangxi', 20);
```

已知nickname字段上有唯一索引约束，现在每条INSERT SQL都加上了`IGNORE`，如果用户昵称已经存在，就不执行插入；否则执行插入。这样就不会影响后续的INSERT SQL的执行。

### 3. 使用`INSERT INTO ... ON DUPLICATE KEY UPDATE`

```sql
INSERT INTO my_user (nickname, mobile, email, address, age) VALUES ('zhangsan', '17777778901', 'zhangsan@foxmail.com', 'Beijing', 18) ON DUPLICATE KEY UPDATE age = age;
INSERT INTO my_user (nickname, mobile, email, address, age) VALUES ('zhangsan', '16688990101', 'lisi@foxmail.com', 'Hangzhou', 28) ON DUPLICATE KEY UPDATE age = age;
INSERT INTO my_user (nickname, mobile, email, address, age) VALUES ('wangwu', '155784983939', 'wangwu@foxmail.com', 'Guangxi', 20) ON DUPLICATE KEY UPDATE age = age;
```

`INSERT INTO ... ON DUPLICATE KEY UPDATE`作用是，若INSERT发生了唯一性约束错误，那么就执行该条记录的更新操作；若没有发生唯一性约束错误，说明记录还未存在，直接执行插入操作。

<hr />