---
layout: post
title: Linux中让进程在后台运行更可靠的几种方法
date: 2020-02-25 09:00:00.000000000 +08:00
tags: 
  - Linux
---

>声明：本篇文章不是原创，转载自：[https://www.ibm.com/developerworks/cn/linux/l-cn-nohup](https://www.ibm.com/developerworks/cn/linux/l-cn-nohup) <br />
>原文章已经写得很好了，这里转载过来，然后自己实践并记录一下。感谢原文章的作者。

我们经常会碰到这样的问题，用telnet/ssh登录到远程的Linux服务器上，执行一些耗时的任务。但是在任务运行结束之前，本地机器和远程Linux机器的网络中断了，或者自己不小心关闭了终端，都会导致Linux上运行的任务被关闭。

如何让命令提交后不受本地关闭终端窗口/网络断开连接的干扰呢？下面举了一些例子， 您可以针对不同的场景选择不同的方式来处理这个问题。

### 一、 nohup/setsid/& 命令

**场景描述：**<br />
如果只是临时有一个命令需要长时间运行，什么方法能最简便的保证它在后台稳定运行呢？<br />
**解决方案：**<br />
当用户注销(logout)或者网络断开时，终端会收到HUP(hangup)信号从而关闭其所有子进程。因此，思路有两个：
- 让进程忽略HUP信号；
- 让进程运行在新的会话里从而成为不属于此终端的子进程。

>**hangup名称的来由：** <br />
>在Unix的早期版本中，每个终端都会通过modem和系统通讯。当用户logout时，modem就会挂断(hang up)电话。 同理，当modem断开连接时，就会给终端发送hangup信号来通知其关闭所有子进程。

#### 1. nohup

nohup无疑是我们首先想到的办法。nohup的用途就是让提交的命令忽略hangup信号。先来看一下nohup的帮助信息：

```bash
$ man nohup
NOHUP(1)                         User Commands                        NOHUP(1)

NAME
       nohup - run a command immune to hangups, with output to a non-tty

SYNOPSIS
       nohup COMMAND [ARG]...
       nohup OPTION

DESCRIPTION
       Run COMMAND, ignoring hangup signals.

       --help display this help and exit

       --version
              output version information and exit
```

nohup的使用很简单，只要在执行的命令前加上nohup即可。标准输出和标准错误默认会被重定向到nohup.out文件中。一般我们可在结尾加上`&`来将命令同时放入后台运行，也可用`>filename 2>&1`来更改默认的重定向文件名。

**nohup + & 的使用示例：**

*`ping www.ibm.com`是我们要运行的任务指令。*

```bash
$ nohup ping www.ibm.com &
[1] 39907

nohup: 忽略输入并把输出追加到"nohup.out"
```

如果要修改标准输出和标准错误重定向的文件，可以使用`>filename 2>&1`：

```bash
$ nohup ping www.ibm.com > output.log 2>&1 &
```

上面我们把标准输出和标准错误输出重定向的文件改成了output.log，并在最后使用`&`来将任务放到后台执行。

>在Shell中，stdin是标准输入；stdout是标准输出；stderr是标准错误输出，分别用数字0，1，2表示。<br />
>上面的2>&1就表示将stderr输出也重定向到stdout所重定向到的同名文件中，即&1表示output.log文件。 <br />
>所以当执行的命令发生标准错误，那么这个错误也会输出到你指定的输出文件中，即output.log文件中。

#### 2. setsid

nohup能通过忽略HUP信号来使我们的进程避免中途被中断。但如果我们换个角度思考，如果我们的进程不属于接受HUP信号的终端的子进程，那么自然也就不会受到该终端的HUP信号的影响了。setsid就能帮助我们做到这一点。让我们先来看一下 setsid 的帮助信息：

```bash
$ man setsid
SETSID(1)                  Linux Programmer’s Manual                 SETSID(1)

NAME
       setsid - run a program in a new session

SYNOPSIS
       setsid program [arg...]

DESCRIPTION
       setsid runs a program in a new session.
```

setsid的使用也同样很简单，只要在执行的命令前加上setsid即可。

**setsid使用示例：**

```bash
$ setsid ping www.ibm.com

$ ps -ef | grep "UID\|www.ibm.com"
UID        PID    PPID   C  STIME TTY      TIME      CMD
LuzHo211   43482     1   0  16:13 ?        00:00:00  ping www.ibm.com
LuzHo211   43484  41875  0  16:13 pts/10   00:00:00  grep UID\|www.ibm.com
```

可以看到我们任务的进程ID为43482，而它的父进程ID为1（即 init 进程ID），并不是当前终端的进程ID。说明使用setsid之后，任务进程变成了init进程的子进程，而不是当前终端进程的子进程。这样一来，就算我们当前终端被关闭或者当前终端的网络跟服务器发生中断，我们的任务进程也不会被关闭。

相比nohup中任务进程的父进程ID：

```bash
$ nohup ping www.ibm.com &
[1] 44109

$ ps -ef | grep "UID\|www.ibm.com\|pts"
UID        PID   PPID   C STIME TTY      TIME     CMD
LuzHo211   41875 41874  0 15:38 pts/10   00:00:00 -bash
LuzHo211   44109 41875  0 16:22 pts/10   00:00:00 ping www.ibm.com
LuzHo211   44157 41875  0 16:23 pts/10   00:00:00 ps -ef
LuzHo211   44158 41875  0 16:23 pts/10   00:00:00 grep UID\|www.ibm.com\|pts
```

可以看出我们的任务进程ID为44109，而其父进程ID为41875；41875就是我们当前终端的PID。

#### 3. &

这里还有一个关于subshell的小技巧。我们知道，将一个或多个命名包含在“()”中就能让这些命令在子shell中运行中，从而扩展出很多有趣的功能，我们现在要讨论的就是其中之一。

当我们将"&"也放入“()”内之后，我们就会发现所提交的作业并不在作业列表中。也就是说，是无法通过jobs来查看的。让我们来看看为什么这样就能躲过HUP信号的影响吧。

**subshell示例：**

```bash
$ (ping www.ibm.com &)

$ ps -ef | grep "UID\|www.ibm.com"
UID        PID  PPID  C STIME TTY          TIME CMD
root     24535     1  0 10:23 pts/2    00:00:00 ping www.ibm.com
root     24650 24560  0 10:26 pts/3    00:00:00 grep --color=auto UID\|www.ibm.com
```

从上例中可以看出，新提交的进程的父进程ID（PPID）为1（即init进程的PID），并不是当前终端的进程ID。因此并不属于当前终端的子进程，从而也就不会受到当前终端的HUP信号的影响了。

### 二、disown 命令

**场景描述：**<br />
在提交命令之前，在命令前加上nohup或者setsid就可以避免HUP信号的影响。但是若我们未加任何处理就已经提交了命令，该如何补救才能让它避免HUP信号的影响呢？ <br />
**解决方案：**<br />
这时想加nohup或setsid已经为时已晚，只能通过作业调度和disown来解决这个问题。先看一下disown的帮助信息：

```bash
disown [-ar] [-h] [jobspec ...]
    Without options, each jobspec is  removed  from  the  table  of
    active  jobs.   If  the -h option is given, each jobspec is not
    removed from the table, but is marked so  that  SIGHUP  is  not
    sent  to the job if the shell receives a SIGHUP.  If no jobspec
    is present, and neither the -a nor the -r option  is  supplied,
    the  current  job  is  used.  If no jobspec is supplied, the -a
    option means to remove or mark all jobs; the -r option  without
    a  jobspec  argument  restricts operation to running jobs.  The
    return value is 0 unless a jobspec does  not  specify  a  valid
    job.
```

可以看出，我们可以用如下方式来达成我们的目的：

- 用 disown -h *jobspec* 来使某个作业忽略HUP信号；
- 用 disown -ah 来使所有的作业都忽略HUP信号；
- 用 disown -rh 来使正在运行的作业忽略HUP信号。

需要注意的是，当使用过disown之后，会将把目标作业从作业列表中移除，我们将不能再使用jobs来查看它，但是依然能够用ps -ef查找到它。

但是还有一个问题，这种方法的操作对象是作业，如果我们在运行命令时在结尾加了**&**来使它成为一个作业并在后台运行，那么就万事大吉了，我们可以通过jobs命令来得到所有作业的列表。但是如果并没有把当前命令作为作业来运行，如何才能得到它的作业号呢？答案就是用ctrl + z（按住ctrl键的同时按住z键）了！

>**灵活运用 ctrl + z** <br />
>我们可以用ctrl + z来将当前进程挂起到后台**暂停运行**，执行一些别的操作；然后再用 fg 来将挂起的进程重新放回前台（也可用 bg 来将挂起的进程放在后台）继续运行。这样我们就可以在一个终端内灵活切换运行多个任务。

ctrl + z的用途就是将当前进程挂起（Suspend），然后我们就可以用jobs命令来查询它的作业号，再用bg *jobspec*来将它放入后台并继续运行。**需要注意的是，如果挂起会影响当前进程的运行结果，请慎用此方法**。

**disown 示例1：**提交命令时已经用**&**将命令放入后台运行，则可以直接使用disown

```bash
$ ping www.ibm.com > ping.log &
[1] 25259

$ jobs
[1]+  Running                 ping www.ibm.com > ping.log &

$ disown -h %1

$ ps -ef | grep ping
root     25259 25167  0 11:02 pts/4    00:00:00 ping www.ibm.com
root     25261 25167  0 11:03 pts/4    00:00:00 grep --color=auto ping
```

>我在Ubuntu上试过，当提交命令的时候就使用&将命令放入后台运行，如果当前终端关闭了，我们提交的命令并不会被终止，并且命令会自动被挂到init进程下面，保持继续运行。

**disown 示例2：**提交命令时未使用**&**将命令放入后台运行，可使用ctrl+z 和 bg 将其放入后台，再使用disown

```bash
// 提交命令（不带&）并ctrl + z将命令挂起
$ ping www.ibm.com > ping.log
^Z
[1]+  Stopped                 ping www.ibm.com > ping.log

// jobs查看作业列表，看到命令已经被挂起
$ jobs
[1]+  Stopped                 ping www.ibm.com > ping.log

// 使用bg将挂起的任务放到后台运行
$ bg %1
[1]+ ping www.ibm.com > ping.log &

// 使用jobs查看，发现任务已经在后台运行
$ jobs
[1]+  Running                 ping www.ibm.com > ping.log &

// 使用disown -h 来让任务免受HUP信号的干扰
$ disown -h %1

$ ps -ef | grep ping
root     25382 25296  0 11:13 pts/6    00:00:00 ping www.ibm.com
root     25387 25296  0 11:16 pts/6    00:00:00 grep --color=auto ping
```

### 三、screen 命令

**场景描述：**<br />
我们已经知道了如何让进程免受HUP信号的影响，但是如果有大量这种命令需要在稳定的后台里运行，如何避免对每条命令都做这样的操作呢？ <br />
**解决方案：**<br />
此时最方便的方法就是screen了。简单的说，screen提供了ANSI/VT100的终端模拟器，使它能够在一个真实终端下运行多个全屏的伪终端。screen的参数很多，具有很强大的功能，我们在此仅介绍其常用功能以及简要分析一下为什么使用screen能够避免HUP信号的影响。先看一下screen的帮助信息：

```bash
SCREEN(1)                                                           SCREEN(1)
 
NAME
       screen - screen manager with VT100/ANSI terminal emulation
 
SYNOPSIS
       screen [ -options ] [ cmd [ args ] ]
       screen -r [[pid.]tty[.host]]
       screen -r sessionowner/[[pid.]tty[.host]]
 
DESCRIPTION
       Screen  is  a  full-screen  window manager that multiplexes a physical
       terminal between several  processes  (typically  interactive  shells).
       Each  virtual  terminal provides the functions of a DEC VT100 terminal
       and, in addition, several control functions from the  ISO  6429  (ECMA
       48,  ANSI  X3.64)  and ISO 2022 standards (e.g. insert/delete line and
       support for multiple character sets).  There is a  scrollback  history
       buffer  for  each virtual terminal and a copy-and-paste mechanism that
       allows moving text regions between windows.
```

screen的使用也很方便，有以下几个常用选项：

- 用 screen -dmS *session name* 来建立一个处于断开模式下的会话（并指定其会话名）;
- 用 screen -list 来列出所有会话；
- 用 screen -r *session name* 来重新连接指定会话；
- 用快捷键 ctrl+a d 来暂时断开当前会话。

**screen 示例：**

```bash
$ screen -dmS Urumchi

$ screen -list
There is a screen on:
	26332.Urumchi	(02/26/2020 12:08:50 PM)	(Detached)
1 Socket in /var/run/screen/S-root.

$ screen -r Urumchi
```

当我们用`-r`参数连接到screen会话后，我们就可以在这个伪终端里面为所欲为，再也不用担心HUP信号会对我们的进程造成影响，也不用给每个命令前都加上nohup或者setsid了。这是为什么呢？让我来看一下下面两个例子吧。

**1. 未使用 screen 时新进程的进程树：**

```bash
$ ping www.baidu.com > ping.log &
[1] 26366

$ pstree -H 26366
systemd─┬─AliYunDun───23*[{AliYunDun}]
        ├─AliYunDunUpdate───3*[{AliYunDunUpdate}]    
        └─sshd─┬─7*[sshd───bash]
               └─sshd───bash─┬─ping
                             └─pstree

```

可以看出，未使用screen时我们所处的bash是sshd的子进程，当ssh断开连接时，HUP信号自然会影响到它下面的所有子进程（包括我们新建立的ping进程）。

**2. 使用了 screen 后新进程的进程树：**

```bash
$ screen -dmS my_new_session

$ screen -r my_new_session

$ ping www.baidu.com > ping.log &
[1] 26421

$ pstree -H 26421
systemd─┬─AliYunDun───23*[{AliYunDun}]
        ├─AliYunDunUpdate───3*[{AliYunDunUpdate}]
        ├─screen───bash─┬─ping
        │               └─pstree
        └─sshd─┬─8*[sshd───bash]
               └─sshd───bash───screen
```

可以看到，使用了screen之后，我们所处的bash则变成了screen进程的子进程，而screen又是systemd的子进程。那么当ssh断开连接时，HUP信号自然不会影响到screen下面的子进程了。

### 四、总结

现在几种方法已经介绍完毕，我们可以根据不同的场景来选择不同的方案。nohup/setsid无疑是临时需要时最方便的方法，disown能帮助我们来事后补救当前已经在运行了的作业，而screen则是在大批量操作时不二的选择了。

