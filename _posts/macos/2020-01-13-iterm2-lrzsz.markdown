---
layout: post
title: Mac OS下iTerm2终端使用rz/sz进行远程文件的下载/上传
date: 2020-01-13 15:25:13.000000000 +08:00
tags: 
  - Mac OS
  - iTerm2
---

![iterm2-logo2x.jpg](/static/image/2020-01/iterm2-logo2x.jpg)

Mac OS下使用iTerm2终端时，经常会使用SSH方式登录到远程服务器，进行文件上传/下载操作。一般情况使用scp命令或者XFtp应用来直接上传/下载文件，但是如果远程服务器跟我们本地电脑之间隔了一层跳板机，scp和XFtp就不太好用了。作为替代方案，我们可以使用sz/rz命令来上传/下载文件。

### 1. 安装lrzsz程序包

sz和rz命令是lrzsz程序包提供的两个命令，所以先安装lrzsz程序包。这里通过[Homebrew](https://brew.sh)来安装lrzsz程序包，如果没有安装Homebrew，请先自行安装。

```bash
$ brew install lrzsz
```

### 2. iTerm2的相关配置脚本

先下载这两个脚本文件：[iterm2-send-zmodem.sh](/static/files/iterm2-send-zmodem.sh) 和 [iterm2-recv-zmodem.sh](/static/files/iterm2-recv-zmodem.sh)

将`iterm2-send-zmodem.sh`和`iterm2-recv-zmodem.sh`脚本放到`/usr/local/bin`目录下，并赋予可执行的权限：

```bash
$ chmod +x /usr/local/bin/iterm2-send-zmodem.sh /usr/local/bin/iterm2-recv-zmodem.sh
```

### 3. 配置iTerm2

*找到iTerm2的配置项：iTerm2的Preferences -> Profiles -> Default -> Advanced -> Triggers*

点击Triggers的Edit按钮，按照以下表格进行配置：

|Regular Expression|Action|Parameters|Instant|
|:---|:---|:---|:---|
|`rz waiting to receive.\*\*B0100`|Run Silent Coprocess|/usr/local/bin/iterm2-send-zmodem.sh|`checked`|
|`\*\*B00000000000000`|Run Silent Coprocess|/usr/local/bin/iterm2-recv-zmodem.sh|`checked`|

**注意：最后一项Instant一定要勾选上！** 如下图的配置：

![iterm2-config.png](/static/image/2020-01/iterm2-config.png)
<hr/>

参考：
- <a href="https://molunerfinn.com/iTerm2-lrzsz/#%E9%85%8D%E7%BD%AEiTerm2" target="_blank">https://molunerfinn.com/iTerm2-lrzsz/#%E9%85%8D%E7%BD%AEiTerm2</a>
