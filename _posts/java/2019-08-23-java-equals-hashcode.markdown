---
layout: post
title: Java为什么要覆写equals和hashCode方法？
date: 2018-08-26 23:36:15.000000000 +08:00
tags: 
  - Java
---

`equals` 和 `hashCode` 是 `java.lang.Object` 类中定义的两个方法，这两个方法均用在对象比较的场景，即判断两个对象是否相等。

```java
public class Object {
    public boolean equals(Object obj) { return (this == obj); }
    public native int hashCode();
}
```

- `equals`方法的作用是判断所传入的对象是否跟当前对象相同，JDK对这个方法的默认实现就是比较两个对象的内存地址，只有这两个对象的内存地址一样才认为它们相同。
- `hashCode`方法的作用是为对象生成一个int类型的哈希码（hashcode），其主要用于配合Java中基于散列的集合一起工作，比如HashMap、HashTable以及HashSet。

### 1. 覆写equals和hashCode方法

要自定义对象的对比逻辑，我们需要覆写对象的equals方法。**如果覆写了equals方法，那么必须同时覆写hashCode方法。因为如果仅仅覆写equals，对象的对比机制可能在某些业务场景能正常工作，但是在结合散列集合（如HashMap）工作的时候，将不能正确按照我们的预期工作！**

>1. 两个对象相等，那它们的`hashCode`方法的返回值一定相同
>2. 两个对象的`hashCode`方法的返回值相同，这两个对象却不一定相等

定义一个Book类，我们自定义的对比机制为：当且仅当两本书的id和name都一样的时候，我们认为它们一样（相等，是同一本书）；否则不一样（不是同一本书）。

*不覆写equals和hashCode的情况：*

```java
public class Book {

    private int id;
    private String name;

    public Book(int id, String name) {
        this.id = id;
        this.name = name;
    }

    // getter/setter

}
```

*测试代码1如下所示：*

```java
private static void test1() {
    Book book1 = new Book(1, "Effective Java");
    Book book2 = new Book(1, "Effective Java");
    System.out.println("book1.equals(book2): " + book1.equals(book2));
    System.out.println("book1.hashCode(): " + book1.hashCode());
    System.out.println("book2.hashCode(): " + book2.hashCode());
}

// 测试结果
book1.equals(book2): false
book1.hashCode(): 1590550415
book2.hashCode(): 1058025095
```

根据场景预设，只要id和name相同我们就认为是同一本书，所以equals对比的结果为`true`才符合我们的预期。但是结果并相同，这是因为我们并没有覆写equals方法，所以默认是对比两个对象的地址。上述测试代码分别`new`了两个Book对象，地址肯定不一样，所以对比结果为`false`。

*仅覆写equals的情况：现在我们在Book类中覆写equals方法，自定义对比机制*

```java
@Override
public boolean equals(Object obj) {
    if (obj == null) {
        return false;
    }
    if (this == obj) {
        return true;
    }
    if (!(obj instanceof Book)) {
        return false;
    }
    return this.getId() == ((Book) obj).getId() && this.getName().equals(((Book) obj).getName());
}
```

此时再运行test1()测试代码，结果如下：

```java
book1.equals(book2): true
book1.hashCode(): 1590550415
book2.hashCode(): 1058025095
```

测试结果表明，只要书本的id和name相同，我们自定义的对比机制已经能正确判断它们是同一本书。

*但是注意：由于我们仅覆写了equals，并没有覆写hashCode，所以比较机制在配合HashMap、HashTable以及HashSet这些散列集合进行使用的时候，将不能正确得到预期的结果。*

测试代码2如下所示：

```java
private static void test2() {
    Book book1 = new Book(1, "Effective Java");
    Book book2 = new Book(1, "Effective Java");
    System.out.println("book1.equals(book2): " + book1.equals(book2));
    System.out.println("book1.hashCode(): " + book1.hashCode());
    System.out.println("book2.hashCode(): " + book2.hashCode());
    // map——维护书本与库存量的关系
    Map<Book, Integer> bookStock = new HashMap<>();
    // 设置id为1，书名为"Effective Java"的这本书的库存为10
    bookStock.put(book1, 10);
    // 查询id为1，书名为"Effective Java"的这本书的库存
    System.out.println("Book[id: 1, name: Effective Java]: " + bookStock.get(book2));
}

// 测试结果
book1.equals(book2): true
book1.hashCode(): 1590550415
book2.hashCode(): 1058025095
Book[id: 1, name: Effective Java]： null
```

查询结果为`null`，说明这本书（`id=1 && name=Effective Java`）在库存中不存在。我们明明已经将这本书的库存设置成10了！哪里出了问题？
**前面提到，任何时候覆写equals，必须同时覆写hashCode方法，否则在结合散列集合将无法正确工作！**

这是因为，散列集合在添加、查找元素的时候都用到了hashCode方法。例如 HashMap 在put或者get的时候，都会先将Key对象的hashCode返回值进行计算，得到一个hash值，根据这个值去定位Value的位置。从上面的测试结果可知，虽然是同一本书，但是它们的hashCode返回值却不同。这就导致HashMap认为book1和book2是两个不同的Key，所以我们在put(book1, 10)却get(book2)的时候肯定找不到这本书。

*同时覆写 equals 和 hashCode 方法：*

```java
@Override
public boolean equals(Object obj) {
    if (obj == null) {
        return false;
    }
    if (this == obj) {
        return true;
    }
    if (!(obj instanceof Book)) {
        return false;
    }
    return this.getId() == ((Book) obj).getId() && this.getName().equals(((Book) obj).getName());
}

@Override
public int hashCode() {
    // 为了简单演示，我们这里将每本书的hashCode返回值设置成书本的id（保证唯一性）
    return this.getId();
}
```

*然后我们再运行test2()测试代码，结果如下：*

```java
book1.equals(book2): true
book1.hashCode(): 1
book2.hashCode(): 1
Book[id: 1, name: Effective Java]: 10
```

运行结果显示，同时覆写equals和hashCode方法之后，程序已经如我们的预期正确运行。

**虽然book1和book2是两个不同的对象（对象地址不一样），但是可以通过覆写equals和hashCode来达到自定义对象的对比逻辑，满足我们一些特殊的业务场景要求。**

### 2. 写在最后

如果我们在使用自定义类的时候，想自定义对象的对比机制来达到某些需求场景的要求，例如上面的例子：如果书本的编号（id）和书本的名字（name）都相同，则认为它们是同一本书。我们可以通过同时覆写equals和hashCode来达到全面的效果，而不是局部起作用。

**为了保证程序的健壮性，只要在任何时候覆写了对象`equals`方法，就一定也要同时记得覆写对象的`hashCode`方法！**

<hr />

参考：

- [Working With hashcode() and equals()](https://dzone.com/articles/working-with-hashcode-and-equals-in-java)
- [浅谈Java中的hashcode方法](https://www.cnblogs.com/dolphin0520/p/3681042.html)
- [Java 中正确使用 hashCode 和 equals 方法](https://www.oschina.net/question/82993_75533)