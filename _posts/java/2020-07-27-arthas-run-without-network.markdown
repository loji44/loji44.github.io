---
layout: post
title: 无网络环境下使用阿里arthas诊断工具
date: 2020-07-27 15:20:00.000000000 +08:00
tags:
 - Java
 - Arthas
---

最近排查一个线上问题，有个第三方公司服务启动后，访问的时候总是报数据库连接失败。由于是第三方服务，没法增加一些日志进行观察，所以使用阿里的arthas在线诊断工具进行排查。服务部署在客户的机房中，不允许连接外部网络，所以手动下载`arthas-boot.jar`并通过`scp`方式上传到目标机器的方式去运行。

根据<a href="https://alibaba.github.io/arthas/install-detail.html" target="_blank">arthas官网安装教程</a>，下载`arthas-boot.jar`，然后`scp`上传到目标主机（客户的机器）：

```bash
$ curl -O https://alibaba.github.io/arthas/arthas-boot.jar
$ scp -rp arthas-boot.jar appweb@192.168.100.4:/appweb/
```

执行`java -jar arthas-boot.jar`，运行结果如下图所示：

![arthas-run](/static/image/2020/arthas-run.png)

原来`arthas-boot.jar`并不是全量包，它会在启动的时候先去阿里Maven仓库下载一些jar包依赖；如果Maven下载失败，那么它会检查本地是否有jar包依赖文件，例如图中的日志：

`[ERROR] Can not find Arthas under local: /root/.arthas/lib`

所以解决方案可以这样：在我的机器上（可联外网），先运行`java -jar arthas-boot.jar`下载得到一个`.arthars`文件夹，里面存放的就是arthas-boot.jar所需的一些jar包依赖。`.arthars`文件夹会默认在用户主目录下生成。

最后将`.arthas`文件夹也`scp`传送到客户的目标机器，即可完成。
