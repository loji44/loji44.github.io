---
layout: post
title: Java ThreadLocalRandom
date: 2019-09-28 10:10:48.000000000 +08:00
tags: 
 - Java
---

在日常开发中，经常会遇到需要生成随机数的情况。一般我都是直接使用`java.util.Random`类直接生成，因为Random类是线程安全的，完全可以在多个线程间共享它的实例。我一直都是这样用的，好像并没有觉得有什么不妥。

```java
public final class RandomUtils {
    private final Random random = new Random();
    
    private RandomUtils() {}
    
    public static int nextInt(int bound) {
        return random.nextInt(bound);
    }
}
```

直到我看了阿里巴巴的开发手册，才发现我这种用法是不太好的。以下摘自阿里巴巴开发手册：

>【推荐】避免Random实例被多线程使用，虽然共享该实例是线程安全的，但会因竞争同一seed导致的性能下降。 <br />
>说明：Random实例包括`java.util.Random`的实例或者`Math.random()`的方式。 <br />
>正例：JDK7之后，可以直接使用 API ThreadLocalRandom；JDK7之前，需要编码保证每个线程持有一个实例。

好吧，我承认是我太菜了。我之前的用法其实没错，但是在高并发情况下会出现性能问题，属于不推荐的使用方式。

### 一、直接共享Random实例的问题

```java
public class Random implements java.io.Serializable {
    
    private final AtomicLong seed;
    private static final long multiplier = 0x5DEECE66DL;
    private static final long addend = 0xBL;
    private static final long mask = (1L << 48) - 1;
    
    protected int next(int bits) {
        long oldseed, nextseed;
        AtomicLong seed = this.seed;
        do {
            oldseed = seed.get();  // 获取上一次的seed
            nextseed = (oldseed * multiplier + addend) & mask;  // 计算新的seed
            // CAS操作设置新的seed：多线程并发更新seed，失败的线程会自旋重试
        } while (!seed.compareAndSet(oldseed, nextseed));
        return (int)(nextseed >>> (48 - bits));
    }
}
```

Random在生成随机数的时候，是根据seed来计算生成的：

1. 先拿到上一次的seed
2. 然后根据上一次的seed，计算新的seed
3. 最后使用CAS操作设置新的seed

看上面Random的next方法源码，在高并发情况下，CAS操作会成为性能瓶颈。因为会有很多线程更新seed失败而自旋重试，竞争很激烈，导致性能下降。

所以，最好能保证每个线程都有自己的Random实例，避免并发情况下多线程同时竞争更新seed的值导致的性能问题。下面使用ThreadLocal来将Random实例隔离起来，让每个线程都有自己的Random实例。

```java
public final class RandomUtils {
    private final static ThreadLocal<Random> threadLocal = new ThreadLocal<>();
    
    private RandomUtils() {}
    
    public static int nextInt(int bound) {
        return getThreadLocalRandom().nextInt(bound);
    }
    
    private static Random getThreadLocalRandom() {
        if (threadLocal.get() == null) {
            threadLocal.set(new Random());
        }
        return threadLocal.get();
    }
}
```
### 二、使用ThreadLocalRandom

JDK7以及之后的版本，可以直接使用`java.util.concurrent.ThreadLocalRandom`类，它已经帮我们封装好了，使用起来也方便很多，直接在用到随机数的地方使用`ThreadLocalRandom.current().nextInt()`即可。

```java
public class ThreadLocalRandomTest {
   public static void main(String[] args) {
       int randomInt = ThreadLocalRandom.current().nextInt();
       System.out.println("随机数：" + randomInt);
   }
}
```

只需要在使用到随机数的地方通过`ThreadLocalRandom.current()`这种方式就可以获取到当前线程的随机数生成器，而不需要共享ThreadLocalRandom的实例。

不要在多线程间共享ThreadLocalRandom的实例，因为这样跟共享Random实例一样会产生并发更新`seed`的竞争。


