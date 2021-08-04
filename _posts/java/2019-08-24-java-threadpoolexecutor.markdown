---
layout: post
title: Java线程池ThreadPoolExecutor
date: 2019-08-24 12:41:45.000000000 +08:00
tags: 
 - Java 
---

先贴出使用`ThreadPoolExecutor`来创建线程池的核心构造函数：

```java
public ThreadPoolExecutor(int corePoolSize,
                              int maximumPoolSize,
                              long keepAliveTime,
                              TimeUnit unit,
                              BlockingQueue<Runnable> workQueue,
                              ThreadFactory threadFactory,
                              RejectedExecutionHandler handler) {

    ... 
}
```

|参数名称|参数说明|
|:---|:---|
|corePoolSize|线程池的核心线程数，一旦创建就会一直保留在线程池中（除非调用`allowCoreThreadTimeOut(true)`方法将`allowCoreThreadTimeOut`参数设置成`true`）|
|maximumPoolSize|线程池中允许存活的最大线程数|
|keepAliveTime|当创建的线程数量超过了核心线程数，允许线程池中处于空闲状态的非核心线程的存活时间（若设置`allowCoreThreadTimeOut`参数为`true`，空闲超时的核心线程也会被回收）|
|unit|keepAliveTime参数的时间单位，例如`TimeUnit.MILLISECONDS`|
|workQueue|工作队列（阻塞队列），用于存放将被执行的线程任务（Runnable tasks）|
|threadFactory|创建线程的工厂，可以用于标记区分不同线程池所创建出来的线程|
|handler|拒绝策略handler。当线程池中线程数量和工作队列的容量均达到上限，继续向线程池提交任务时所触发的拒绝策略逻辑handler|

### 1. 线程池大小与线程存活时间

线程池有两个关于线程数量配置的参数：`corePoolSize`和`maximumPoolSize`：

- `corePoolSize`：设置线程池的核心线程数
- `maximumPoolSize`：设置线程池中允许存活的最大线程数

`keepAliveTime`参数用于设置**非核心线程**的存活时间，使用`unit`参数指定时间单位。即**非核心线程**空闲的时间超过了所设置的keepAliveTime，线程就会被回收。默认情况下，核心线程一旦被创建就不会被回收，但是若设置了`allowCoreThreadTimeOut`参数为`true`，核心线程也会被回收。

```java
// 允许回收空闲的核心线程
threadPoolExecutor.allowCoreThreadTimeOut(true);
```

线程池创建后，池中默认不会有任何线程。当向线程池中提交任务时，线程池才会创建线程。但是如果显式调用了prestartAllCoreThreads()或者prestartCoreThread()方法，会立即创建核心线程。

```java
// 调用prestartAllCoreThreads()来立即创建所有核心线程
threadPoolExecutor.prestartAllCoreThreads();
// 或者调用prestartCoreThread()来立即创建一个核心线程
threadPoolExecutor.prestartCoreThread();
```

### 2. 线程池工作队列（Work Queue）

工作队列的用处就是用来缓存所提交的线程任务（Runnable task）。线程池的工作队列采用的是阻塞队列（BlockingQueue），可以直接在多线程并发的环境下缓存线程任务。

>阻塞队列特性：如果阻塞队列为空（empty），则尝试从队列中获取（读取）任务的线程会被阻塞；如果阻塞队列满了（full），则尝试往队列中插入任务的线程会被阻塞。

|阻塞队列|阻塞队列说明|
|:---|:---|
|ArrayBlockingQueue|一个基于数组结构的**有界**阻塞队列。|
|LinkedBlockingQueue|一个基于链表结构的**有界**阻塞队列。|
|SynchronousQueue|同步移交队列，本身不存储任何元素。一个线程的插入操作必须等待另一个线程来读取才能完成，才会允许下一个插入操作。|
|PriorityBlockingQueue|一个支持优先级排序的**无界**阻塞队列。|
|DelayQueue|一个使用优先级队列实现的**无界**阻塞队列。用于处理延迟任务。|

### 3. 线程池拒绝策略（Rejected Handler）

当线程池的工作队列满了，并且线程池中线程数量也已经达到最大值；继续往线程池中提交任务时，就会触发拒绝策略。`  ThreadPoolExecutor`内置了四种拒绝策略：

- `AbortPolicy`：取消策略，丢弃任务并抛出RejectedExecutionException，默认的拒绝策略。
- `DiscardPolicy`：丢弃策略，丢弃任务但是不会抛出任何异常。
- `DiscardOldestPolicy`：丢弃策略，丢弃队列中最老的任务并尝试重新执行所提交的任务。
- `CallerRunsPolicy`：调用者执行策略，将任务直接给提交该任务的线程来执行。

以上四种拒绝策略是`ThreadPoolExecutor`内置的，对于被拒绝的任务处理比较简单。我们也可以继承这些拒绝策略类或者直接实现`RejectedExecutionHandler`接口来自定义拒绝策略。

### 4. 线程池工作流程要点

1. 当线程池中的线程数量**小于**核心线程数：新提交一个任务时，无论是否存在空闲的线程，线程池都将新建一个新的线程来执行新任务；
2. 当线程池中的线程数量**等于**核心线程数（核心线程已满）：新提交的任务会被存储到工作队列中，等待空闲线程来执行，**而不会创建新线程**；
3. 当工作队列已满，并且池中的线程数量**小于**最大线程数（`maximumPoolSize`）：如果继续提交新的任务，线程池会创建新线程来处理任务；
4. 当工作队列已满，并且池中线程数量已达到最大值：继续提交新任务时，线程池会触发拒绝策略处理逻辑；
5. 如果线程池中存在空闲的线程并且其空闲时间达到了`keepAliveTime`参数的限定值，线程池会回收这些空闲线程，但是线程池不会回收空闲的核心线程；但是如果在创建线程池的时候设置了`allowCoreThreadTimeOut`参数为`true`，空闲超时的核心线程也会被回收。

### 5. 如何向线程池提交任务？

向线程池中提交线程任务有两种方式：调用`execute`方法或者调用`submit`方法。

##### 5.1 调用`execute`方法提交任务

execute方法定义在`java.util.concurrent.Executor`接口中：

```java
public interface Executor {
    void execute(Runnable command);
}
```

execute方法没有返回值，并且只能接收`Runnable`类型的任务，总体来说比较简单，任务提交之后就是等待CPU调度执行了。

##### 5.2 调用`submit`方法提交任务

submit方法定义在`java.util.concurrent.ExecutorService`接口中，有三种形式：

```java
public interface ExecutorService extends Executor {
    <T> Future<T> submit(Callable<T> task);
    <T> Future<T> submit(Runnable task, T result);
    Future<?> submit(Runnable task);
}
```

与execute方法不同的是，submit方法有返回值，这就意味着我们可以在线程任务执行完之后，拿到线程任务执行结果；而且除了`Runnable`任务，submit还支持提交`Callable`类型的任务，我们来看看`Callable`是什么：

```java
@FunctionalInterface
public interface Callable<V> {
    V call() throws Exception;
}
```

很明显，跟`Runnable`一样也是个函数式接口（FunctionalInterface），但是跟`Runnable`不一样的地方在于，`Callable`带有返回值！这就为我们在任务执行完毕之后获取执行结果提供了可能！

下面来看看submit的第一个方法：`<T> Future<T> submit(Callable<T> task);`

![submit1.png](/static/image/2020-06/submit1.png)

submit的其他两个方法也差不多类似，这里就不详细展开了。它们虽然接收的是`Runnable`类型参数，但是最终都会转换成`Callable`类型任务：

![runnable2callable.png](/static/image/2020-06/runnable2callable.png)

总之，submit方法将提交的`Runnable`或`Callable`任务封装成一个`FutureTask`对象，最终执行任务的时候，就是调用`FutureTask`对象中的`run`方法：

![futuretask-run.png](/static/image/2020-06/futuretask-run.png)

submit提交任务后，若任务执行时发生异常，异常不会直接抛出来，而是会被FutureTask封装到一个名叫`outcome`变量中，等到调用`Future.get`的时候异常才会抛出来，这点在使用的时候要注意。

![future-get.png](/static/image/2020-06/future-get.png)

submit在线程任务异常的处理方式上与execute区别很大：execute的异常只能由线程池中执行该任务的线程自己消化掉，例如`try-catch`掉，在其他地方（例如调用者线程）企图`try-catch`任务的异常，是没法做到的。对于execute方式，想要在其他地方捕获任务执行时抛出的异常，似乎只能通过为线程设置`Thread.UncaughtExceptionHandler`来完成。

submit则是先将异常封装起来，不会立即抛出。直到调用`Future.get`的时候才会将异常抛出，即我们能从其他地方捕获到任务的异常。在使用的时候需要注意，因为有时候只是想向线程池中提交任务，而不会调用`Future.get`获取结果（因为不关心结果）。如果发生异常，FutureTask会「吞掉」我们的异常，我们在日志中根本看不到任何异常信息，这会对我们的问题排查带来很大问题。

##### 5.3 选择execute还是submit？

通常情况下，如果如果不关心任务执行结果，那么直接用execute方法即可；如果关心结果，可以使用`submit + Future.get`组合来拿到任务执行结果。

另外，execute和submit方法对异常的处理方式也不同，execute提交的任务在执行时如果发生异常，会被执行该任务的线程消化掉（要么线程自己`try-catch`掉，要么线程没处理，线程终止），外部其他地方无法捕获，除非设置了`Thread.UncaughtExceptionHandler`；submit方法提交的任务在执行时发生的异常，会被FutureTask「吞掉」，然后在用户调用`Future.get`时将异常抛出。

### 6. 线程池工具类（Executors）

JDK提供了`java.util.concurrent.Executors`这个工具类来帮助我们快速创建线程池。

- `newFixedThreadPool(int nThreads)`：创建一个固定数量线程的线程池，池中的线程数量达到最大值后会始终保持不变。
- `newSingleThreadExecutor()`：创建一个只包含单个线程的线程池，可以保证所有任务按提交的顺序被单一的一个线程串行地执行。
- `newCachedThreadPool()`：创建一个会根据任务按需地创建、回收线程的线程池。这种类型线程池适合执行数量多、耗时少的任务。
- `newScheduledThreadPool(int corePoolSize)`：创建一个具有定时功能的线程池，适用于执行定时任务。

以上四种定义好的线程池确实很方便我们的使用，但是我们需要了解它们的隐患之处：

- `FixedThreadPool`、`SingleThreadPool`的工作队列最大容量为`Integer.MAX_VALUE`，这有可能会随着工作队列中的任务堆积而导致`OOM`；
- `CachedThreadPool`、`ScheduledThreadPool`允许最大线程数为`Integer.MAX_VALUE`，这也有可能因为创建大量线程导致`OOM`或者线程切换开销巨大。