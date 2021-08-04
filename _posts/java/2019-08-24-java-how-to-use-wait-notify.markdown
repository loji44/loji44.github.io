---
layout: post
title: Java线程间通信之wait/notify
subtitle: 
date: 2019-08-24 11:18:10.000000000 +08:00
tags: 
  - Java
---

>此文为自己翻译的文章，在保留原意的基础上对原文的代码稍有调整。<br /> 英文原文地址：[How to use wait, notify and notifyAll in Java - Producer Consumer Example](https://javarevisited.blogspot.com/2015/07/how-to-use-wait-notify-and-notifyall-in.html)。

在Java中，可以使用wait，notify和notifyAll方法来实现线程间的通信。

举个栗子，程序中运行着两个线程，分别是**生产者线程**和**消费者线程**。假设有一个固定容量的消息队列：当队列中有可消费的消息时，生产者线程会通知消费者线程进行消息的消费；同样地，当队列中有额外的空间时，消费者线程会通知生产者线程进行消息的生产。即：当消息队列满了，生产者线程应该停止生产并进入等待状态；当消息队列为空的时候，消费者线程应该停止消费并进入等待状态。

如果某些线程正在等待某些条件变为`true`，你可以在条件改变的时候使用notify或者notifyAll方法来通知这些线程并唤醒它们。notify方法和notifyAll方法都会向等待的线程发送通知，区别在于：如果有多个线程处于等待状态，notify发送的通知只会被其中一个线程收到，且不能保证是哪个线程收到；而notifyAll发送的通知会被所有线程收到。如果只有一个线程在等待**对象锁**，那么notify和notifyAll的效果是一样的，发出的通知都会被该线程接收到。

>在这篇文章中，你将会学习到如何使用wait，notify和notifyAll方法实现线程间通信，并解决生产者-消费者的问题。如果你真正想掌握并发和多线程，我强烈建议你读一读《Java Concurrency In Practice》这本书，作者是Brian Goetz。没读过此书，你对Java多线程的理解是不完整的。

## 1. 如何在代码中使用wait和notify方法
wait和notify都是定义在java.lang.Object类中的方法。虽然它们都是很基础的概念，但是想在实际代码中使用它们却不是那么容易呢。不信你可以在面试中让面试者使用wait和notify徒手撸代码来解决**生产者-消费者问题**？我相信很多人会一脸的疑惑。
很多人都会对这个问题不知所措或者错误地使用wait和notify，例如代码块使用同步的地方错了、没有用正确的对象来调用wait方法。老实说，这些困扰着很多程序员。

>困惑1：如何使用wait方法？wait方法不是java.lang.Thread类中定义的，所以你不能直接向调用Thread.sleep()那样来调用wait方法。<br />

<a>正确调用wait方法的姿势：**你有一个被多个线程共享的对象实例，你需要使用该对象实例来调用wait方法！** 在生产者-消费者问题里面，这个被共享的对象实例就是指被生产者和消费者共享的队列。</a>

>困惑2：应该在同步代码块（synchronized block）中调wait方法还是在同步的方法（synchronized method）中调用wait方法？如果使用同步块，哪个对象应该被放在同步块中？

<a>答案是：加锁的对象和你要获取锁的对象应该是同一个！在这个例子中，就是那个队列的对象实例。</a>

## 2. 在循环体中调用wait方法，而非if代码块中
你现在已经知道需要使用一个同步的、共享的对象来调用wait方法，接下来要做的就是在`while`循环中调用wait方法，而不是在`if`代码块中调用。
我们需要在某些条件成立的情况下调用wait方法，例如生产者线程应该在队列满的时候调用wait。这时候我们首先会想到使用`if`来判断条件是否成立。但是在`if`代码块中调用wait方法可能会产生BUG，因为线程有可能会在等待条件未改变的情况下被**虚假唤醒（spurious wakeup）**。如果没有使用循环来在线程唤醒后检查等待条件，就很可能会造成错误。例如会造成往满队列中写数据或者从空队列中取数据。这就是我们应该在循环体中调用wait，而不是在`if`块中调用wait的原因。
另外，我也推荐阅读《Effective Java》这本书里面关于这部分内容的描述，也许是wait和notify使用的最佳实践。
基于上述知识，这里给出在Java中调用wait和notify的标准方式：

```java
// 在Java中调用wait方法的正确姿势
synchronized (sharedObject) {
   while (condition) {
      sharedObject.wait(); // 在循环体中调用wait方法：线程会释放对象锁，等待被唤醒
   }
   // 在这里执行一些操作：例如将消息写入队列或者从队列中获取消息
}
```

正如我所说的那样，始终应该在循环体中调用wait。这个循环体是用来对线程**进入等待**和**被唤醒后**的条件进行检测。**如果条件成立，并且notify或notifyAll方法在线程执行wait方法之前被调用了，线程就有可能一直wait，导致死锁。**

## 3. 正确使用wait，notify和notifyAll的例子
>这个例子将演示如何使用我们上面讨论的标准方法来使用wait，notify和notifyAll方法。
>在这个例子中，我们有两个线程：生产者线程和消费者线程，分别由Producer和Consumer两个类来表示。我们使用LinkedList对象实例作为共享的消息队列。

生产者运行在一个死循环中，并不断生产消息、将消息写入队列。通过`while(queue.size >= maxSize)`条件来判断队列是否已满。**记住：在执行`while(queue.size == maxSize)`条件检查之前，先给队列的对象实例加锁，保证我们执行检查时不会有其他线程修改队列。** 如果队列满了，生产者线程会调用wait挂起，直到消费者消费了消息并调用notify通知生产者继续消费。

```java
// 生产者线程
public class Producer extends Thread {

    private final static Logger logger = LoggerFactory.getLogger(Producer.class);
    private final Queue<Integer> queue;
    private final int maxSize;
    private int messageCount = 1;

    public Producer(Queue<Integer> queue, int maxSize, String threadName) {
        super(threadName);
        this.queue = queue;
        this.maxSize = maxSize;
    }

    @Override
    public void run() {
        while (true) {
            synchronized (queue) {  // 在条件判断之前给共享资源加锁
                while (queue.size() >= maxSize) {
                    try {
                        logger.info("消息队列已满: 生产者线程调用wait方法进入等待状态 ...");
                        queue.wait(); // 在循环体中：使用共享对象来调用wait方法，释放共享资源的锁
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                }
               
                sleep(1000);  // 让生产者每1秒钟生产一条消息
              
                int messageId = messageCount++;
                logger.info("生产消息: {}", messageId);
                queue.add(messageId);  // 将消息写入队列
                queue.notifyAll();     // 通知消费者线程，对消息进行消费
            }
        }
    }
}


// 消费者线程
public class Consumer extends Thread {

    private final static Logger logger = LoggerFactory.getLogger(Consumer.class);
    private final Queue<Integer> queue;

    public Consumer(Queue<Integer> queue, String threadName) {
        super(threadName);
        this.queue = queue;
    }

    @Override
    public void run() {
        while (true) {
            synchronized (queue) {  // 在条件判断之前给共享资源加锁
                while (queue.isEmpty()) {
                    try {
                        logger.info("消息队列为空: 消费者线程调用wait方法进入等待状态 ...");
                        queue.wait();  // 在循环体中：使用共享对象来调用wait方法，释放共享资源的锁
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                }
                logger.info("消费消息: {}", queue.remove());
                queue.notifyAll();     // 通知生产者线程，可以继续生产消息了
            }
        }
    }
}

// 测试代码
public class Launcher {
    
    public static void main(String[] args) throws Exception {
        Queue<Integer> queue = new LinkedList<>();
        int maxSize = 5;
        new Producer(queue, maxSize, "producer-thread").start();
        new Consumer(queue, "consumer-thread").start();
    }
    
}
```
执行的结果如下日志所示：

```bash
2019-08-24 14:59:46.149 INFO  [producer-thread] 生产消息: 1
2019-08-24 14:59:47.166 INFO  [producer-thread] 生产消息: 2
2019-08-24 14:59:48.167 INFO  [producer-thread] 生产消息: 3
2019-08-24 14:59:48.167 INFO  [consumer-thread] 消费消息: 1
2019-08-24 14:59:48.167 INFO  [consumer-thread] 消费消息: 2
2019-08-24 14:59:48.167 INFO  [consumer-thread] 消费消息: 3
2019-08-24 14:59:48.167 INFO  [consumer-thread] 消息队列为空: 消费者线程调用wait方法进入等待状态 ...
2019-08-24 14:59:49.167 INFO  [producer-thread] 生产消息: 4
2019-08-24 14:59:50.168 INFO  [producer-thread] 生产消息: 5
2019-08-24 14:59:51.168 INFO  [producer-thread] 生产消息: 6
2019-08-24 14:59:52.169 INFO  [producer-thread] 生产消息: 7
2019-08-24 14:59:53.170 INFO  [producer-thread] 生产消息: 8
2019-08-24 14:59:53.170 INFO  [producer-thread] 消息队列已满: 生产者线程调用wait方法进入等待状态 ...
2019-08-24 14:59:53.170 INFO  [consumer-thread] 消费消息: 4
2019-08-24 14:59:53.170 INFO  [consumer-thread] 消费消息: 5
2019-08-24 14:59:53.170 INFO  [consumer-thread] 消费消息: 6
2019-08-24 14:59:53.170 INFO  [consumer-thread] 消费消息: 7
2019-08-24 14:59:53.170 INFO  [consumer-thread] 消费消息: 8
2019-08-24 14:59:53.170 INFO  [consumer-thread] 消息队列为空: 消费者线程调用wait方法进入等待状态 ...
2019-08-24 14:59:54.170 INFO  [producer-thread] 生产消息: 9
2019-08-24 14:59:54.170 INFO  [consumer-thread] 消费消息: 9
2019-08-24 14:59:54.170 INFO  [consumer-thread] 消息队列为空: 消费者线程调用wait方法进入等待状态 ...
2019-08-24 14:59:55.171 INFO  [producer-thread] 生产消息: 10
2019-08-24 14:59:56.171 INFO  [producer-thread] 生产消息: 11
2019-08-24 14:59:57.172 INFO  [producer-thread] 生产消息: 12
2019-08-24 14:59:58.172 INFO  [producer-thread] 生产消息: 13
2019-08-24 14:59:59.173 INFO  [producer-thread] 生产消息: 14
2019-08-24 14:59:59.173 INFO  [producer-thread] 消息队列已满: 生产者线程调用wait方法进入等待状态 ...
2019-08-24 14:59:59.173 INFO  [consumer-thread] 消费消息: 10
2019-08-24 14:59:59.173 INFO  [consumer-thread] 消费消息: 11
2019-08-24 14:59:59.173 INFO  [consumer-thread] 消费消息: 12
2019-08-24 14:59:59.173 INFO  [consumer-thread] 消费消息: 13
2019-08-24 14:59:59.173 INFO  [consumer-thread] 消费消息: 14
2019-08-24 14:59:59.173 INFO  [consumer-thread] 消息队列为空: 消费者线程调用wait方法进入等待状态 ...
2019-08-24 15:00:00.174 INFO  [producer-thread] 生产消息: 15
2019-08-24 15:00:01.174 INFO  [producer-thread] 生产消息: 16
2019-08-24 15:00:02.175 INFO  [producer-thread] 生产消息: 17
2019-08-24 15:00:03.175 INFO  [producer-thread] 生产消息: 18
2019-08-24 15:00:04.175 INFO  [producer-thread] 生产消息: 19
2019-08-24 15:00:04.175 INFO  [producer-thread] 消息队列已满: 生产者线程调用wait方法进入等待状态 ...
```
## 4. 写在最后
- 你可以使用wait和notify方法来实现Java的线程间通信。不仅一个或两个线程可以这样做，多线程之间同样可以使用这种方法达到线程间通信的目的。
- 要在同步方法或者同步块中调用wait，notify和notifyAll方法，否则JVM会抛IllegalMonitorStateException。
- 要在循环体中调用wait和notify方法，不要在`if`块中调用。因为循环可以做到在wait前后对条件进行检测。
- 使用共享对象来调用wait方法。
- 最好使用notifyAll而不是notify，原因在[这里](https://javarevisited.blogspot.com/2012/10/difference-between-notify-and-notifyall-java-example.html)。

<hr />