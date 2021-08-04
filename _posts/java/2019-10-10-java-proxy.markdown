---
layout: post
title: Java中的代理机制
date: 2019-10-10 23:36:15.000000000 +08:00
tags: 
  - Java
---

### 1. 为什么要使用代理

代理对象可以对目标对象的间接访问，即通过代理访问目标对象。这样就可以在不修改（不入侵）目标实现的基础上对目标对象的功能进行增强，例如在在目标对象的方法前后加上额外的功能代码。

### 2. JDK静态代理

例如有一个售票处的接口：包含售票方法（`sellTicket`）和退票方法（`refundTicket`）

```java
public interface TicketOffice {
    void sellTicket();
    void refundTicket();
}
```

目标对象的实现：

```java
public class TicketOfficeImpl implements TicketOffice {
    @Override
    public void sellTicket() {
        System.out.println("正在售票 ...");
    }

    @Override
    public void refundTicket() {
        System.out.println("正在退票 ...");
    }
}
```

若要在售票之前做一些必要的检查，比如核实用户的身份证和实名信息。我们可以怎么做？首先想到的可能就是直接修改目标对象的方法，在售票之前加上校验的逻辑，例如下面：

```java
public class TicketOfficeImpl implements TicketOffice {
    @Override
    public void sellTicket() {
        System.out.println("正在核实用户的身份证和实名信息 ...");
        System.out.println("正在售票 ...");
    }
}
```

这种做法简单粗暴，在业务不复杂的时候用起来也还OK。但是如果`TicketOffice`接口有很多目标实现类，比如夸张点1000个，那岂不是要一个个目标类改过去`:(`。而且这种直接修改目标对象，入侵目标对象的代码有时候是无法做到的，比如你是用的是第三方的jar包引入的一个接口和目标实现，你就无法直接修改它的实现来完成功能增强。

在进一步考虑，可以使用JDK的静态代理。

>静态代理的实现：编写一个**代理对象**，跟**目标对象**实现相同的接口，并在**代理对象**内部维护一个**目标对象**的引用，然后通过构造器注入**目标对象**的实例。最后在**代理对象**中调用目标对象的同名方法来完成代理。

下面写一个代理类`TicketOfficeProxy`：

```java
public class TicketOfficeProxy implements TicketOffice {
    // 代理类内部维护一个目标对象的引用
    private TicketOffice ticketOffice;
    
    // 构造器注入目标对象实例
    public TicketOfficeProxy(TicketOffice ticketOffice) {
        this.ticketOffice = ticketOffice;
    }

    @Override
    public void sellTicket() {
        // 在代理对象的sellTicket方法中做额外的功能
        System.out.println("正在核实用户的身份证和实名信息 ...");
        // 调用目标对象的同名方法
        ticketOffice.sellTicket();
    }
}

public class Test {
    public static void main(String[] args) {
        // 构建代理对象实例：将目标对象实例通过构造器注入
        TicketOfficeProxy proxy = new TicketOfficeProxy(new TicketOfficeImpl());
        // 调用代理类的方法，会映射到目标类的同名方法
        proxy.sellTicket();
    }
}
```

静态代理做到了在不修改（不入侵）目标对象代码的情况下，对目标对象进行拦截和功能扩展。

>JDK静态代理：为了保证代理类可以和目标类的结构（方法）保持一致，从而在调用代理对象的时候可以最终映射到目标对象的同名方法，那么代理对象必须跟目标对象实现同一个接口。

静态代理也有局限性：如果有很多个目标类需要进行代理，而且每个目标类实现的接口都不一样，就需要为每个目标类都写一个代理类 `:(`

![static_proxy](/static/image/2019/static_proxy.png)

到这里我们可以发现，所谓静态代理就是需要我们手工一个个将所需要的代理类“码”出来，然后经过编译器编译成`.class`文件。这是很麻烦的，有没有可能在我们需要用到代理对象的时候，JVM在运行时帮我们自动生成代理对象呢？

静态代理没法做到，但是JDK动态代理可以！

### 3. JDK动态代理

JDK静态代理我们已经知道需要在代码编译之前就要把所有代理类都写好，这个还是非常麻烦的。所以JDK动态代理就做了这么一件事：在运行时自动帮我们生成代理对象！

但是怎么生成呢？

>我们知道代理对象必须要跟目标对象实现同一个接口，因为这样才能保证调用代理对象的方法时能够最终映射到目标对象的同名方法。

要创建一个对象的实例，最关键的是要得到对应的Class对象。每个`.class`类文件在经过类加载之后，都会在JVM方法区生成一个对应的Class对象。最终`new`一个实例的时候就是通过这些Class对象提供的Class类信息来完成的。

![class](/static/image/2019/class.png)

拿到代理对象的Class之后就可以使用Class类提供的反射方法来创建代理对象！

JDK提供`java.lang.reflect.Proxy`类和`java.lang.reflect.InvocationHandler`接口来实现动态代理：

```java
// 封装一个方法，便于直接生成代理对象
private static Object getProxy(final Object target) {
    return Proxy.newProxyInstance(target.getClass().getClassLoader(), target.getClass().getInterfaces(), new InvocationHandler() {
        @Override
        public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
            try {
                System.out.println("目标对象方法执行之前 ...");
                // 通过反射调用目标对象的方法
                Object returnObj = method.invoke(target, args);
                System.out.println("目标对象方法执行之后 ...");
                return returnObj;
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        }
    });
}
```

`Proxy`类提供了一个静态方法`newProxyInstance`来生成目标对象的代理对象。而`newProxyInstance`正是通过获取传入的目标对象所实现的接口的Class对象（`target.getClass().getInterfaces()`）来“拷贝”类的结构信息（主要是方法描述信息），用于构建代理对象的Class对象。最后再通过代理对象的Class对象的反射机制，创建出代理对象的实例。

```java
private static final Class<?>[] constructorParams = { InvocationHandler.class };
    
public static Object newProxyInstance(ClassLoader loader, Class<?>[] interfaces, InvocationHandler h) throws IllegalArgumentException {
        Objects.requireNonNull(h);

        // 拷贝目标对象所实现的接口的Class对象信息
        final Class<?>[] intfs = interfaces.clone();
        final SecurityManager sm = System.getSecurityManager();
        if (sm != null) {
            checkProxyAccess(Reflection.getCallerClass(), loader, intfs);
        }

        // 这里是重点：根据接口的Class信息创建出代理对象的Class对象
        // 最终这里可以生成我们所需要的代理对象的Class对象，有了Class对象我们就通过反射创建代理对象了！
        Class<?> cl = getProxyClass0(loader, intfs);
        
        // ... ...
 
        final Constructor<?> cons = cl.getConstructor(constructorParams);
        
        // ... ...
        
        return cons.newInstance(new Object[]{h});
}
```

`cons.newInstance(new Object[]{h})`在使用代理对象的构造器创建代理对象时，会将`InvocationHandler`传进去。这样在调用代理对象的方法时，最终都会调用到`InvocationHandler`的`invoke`方法。而`invoke`方法里面使用反射`method.invoke(target, args)`来调用目标对象的方法，这就完成了代理。

```java
public class Test {
    public static void main(String[] args) {
        // 这样只需要调用getProxy方法并传入目标对象的实例，就可以返回该目标对象的代理对象
        TicketOffice ticketOffice = (TicketOffice) getProxy(new TicketOfficeImpl());
        ticketOffice.sellTicket();
        System.out.println("代理对象的类名：" + ticketOffice.getClass().getName());
        System.out.println("代理对象的父类名：" + ticketOffice.getClass().getSuperclass().getName());
    }
}

// 运行结果
目标对象方法执行之前 ...
正在售票 ...
目标对象方法执行之后 ...
代理对象的类名：com.sun.proxy.$Proxy3
代理对象的父类名：java.lang.reflect.Proxy
```

从运行结果来看，动态代理对象确实成功对目标对象进行拦截并完成增强。

>JVM生成的代理对象类型为`com.sun.proxy.$Proxy3`，而代理对象的父类则是`java.lang.reflect.Proxy`！

上面提到，在生成代理对象的时候会从构造器传入一个`java.lang.reflect.InvocationHandler`的实例，而`java.lang.reflect.Proxy`类里面恰好定义了一个成员变量用于接收`InvocationHandler`实例：

```java
public class Proxy implements java.io.Serializable {
    
    // ... ...
    
    /**
     * the invocation handler for this proxy instance.
     * @serial
     */
    protected InvocationHandler h;
   
    // ... ...
}
```

代理对象继承`java.lang.reflect.Proxy`之后也就间接拥有了这个`InvocationHandler`实例，这也就是为什么调用代理对象的方法最终都会调用到`InvocationHandler`的`invoke`方法，从而转到目标对象的同名方法上去。

### 4. 题外话：CGLIB动态代理

Java的动态代理大体上可以分为JDK动态代理和CGLIB动态代理；

- JDK动态代理由JDK自带的动态代理实现，只能代理实现了接口的目标对类；
- CGLIB是一个第三方实现的动态代理，它不仅可以代理实现了接口的目标对类，还能代理普通的类（没有实现接口），因而功能更强大。

>本人对CGLIB底层实现原理不是很了解，这里不会详细介绍CGLIB原理，而是大体说说自己的一些认知。

CGLIB的原理大致理解为：CGLIB会为要代理的目标类生成一个子类，这个子类就是代理类。子类会重写目标类的所有方法（final修饰的方法除外），从而在子类（代理类）的同名方法中对父类（目标类）的方法进行拦截、调用并做一些增强的代码逻辑。

CGLIB在生成代理类的时候，使用的是字节码处理框架ASM，来转换字节码并生成新的类。

>虽然CGLIB从功能上确实比JDK动态代理要强，但是它也有自己的局限性。由于是为目标对象生成子类，所以CGLIB不能代理final修饰的类以及final修饰的方法。

CGLIB动态代理是Java动态代理在发展过程中，为了解决一些JDK动态代理所不能解决的一些问题而衍生出来的。我理解为它是JDK动态代理的一个很好的补充，谈不上替代JDK动态代理。

反而在实际应用中我们会经常看到两种动态代理都会使用到，例如Spring AOP在做代理时，默认情况下，如果目标对象实现了接口，它会使用JDK动态代理来生成代理类；而对于普通类，则默认使用CGLIB动态代理生成代理类。

例如下面的代码：当然这不是Spring AOP的源码，只是为了阐释自己写的一个。大体意思明白就好

```java
public Object getProxy(final Object target) {
    Class<?>[] interfaces = target.getClass().getInterfaces();
    if (interfaces.length > 0) {
        // 目标对象实现了接口：优先使用JDK动态代理生成代理对象
        return Proxy.newProxyInstance(target.getClass().getClassLoader(), target.getClass().getInterfaces(), new InvocationHandler() {
            @Override
            public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
                try {
                    System.out.println("JDK动态代理：目标对象方法执行之前 ...");
                    Object returnObj = method.invoke(target, args);
                    System.out.println("JDK动态代理：目标对象方法执行之后 ...");
                    return returnObj;
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            }
        });
    }

    // 目标对象没有实现任何接口：使用CGLIB代理生成代理对象
    Enhancer enhancer = new Enhancer();
    enhancer.setSuperclass(target.getClass());
    enhancer.setCallback(new MethodInterceptor() {
        @Override
        public Object intercept(Object obj, Method method, Object[] args, MethodProxy proxy) throws Throwable {
            try {
                System.out.println("CGLIB动态代理：目标对象方法执行之前 ...");
                // 这里看到，CGLIB最终会调用父类，也就是目标类的方法
                Object returnObj = proxy.invokeSuper(obj, args);
                System.out.println("CGLIB动态代理：目标对象方法执行之后 ...");
                return returnObj;
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        }
    });
    return enhancer.create();
}
```

<hr />

参考：

- [Java 动态代理作用是什么？](https://www.zhihu.com/question/20794107/answer/658139129)
- [Java Proxy和CGLIB动态代理原理](https://www.cnblogs.com/carpenterlee/p/8241042.html)