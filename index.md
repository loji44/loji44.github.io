---
layout: archive
permalink: /
title: 
---


<div class="front-cover" style="background:url(./images/{{ site.cover_image }}) no-repeat fixed center;background-size:cover;overflow:hidden;">
    
    <section>
        <div class="container" style="padding-top:1em;">
            <h1 style="text-align:center;color:#fff;font-weight:600;" id="site-title-front">{{ site.title }}</h1>
            {% if site.description %}<h3 style="text-align:center;color:#fff;font-weight:600;font-size:90%;">{{ site.description }}</h3>{% endif %}
        </div>
<div class="featured" style="border-top:1px solid grey;margin:0 10% 0 10%;">
<div style="background-image:linear-gradient(-130deg, rgba(14,21,58,0.3) 10%, rgba(74,76,123,0.5) 35%, rgba(161,140,171,0.2) 65%, rgba(243,201,215,0.2) 90%);">
{% for post in site.posts limit:1 %}
<h3 style="text-align:center;font-size:120%;">最新文章：<a href="{{ site.url }}{{ post.url }}" style="text-align:center;color:white;font-weight:600;">{{ post.title }}</a></h3>
<p style="text-align:left;color:#fff;font-size:90%;padding-bottom:0.5em;padding-left:2%;padding-right:2%;">{{ post.summary }}</p>
{% endfor %}
</div>
</div>
    </section>

</div>





# 一个简洁的 Jekyll 主题


基于 [skinny-bones](https://github.com/mmistakes/skinny-bones-jekyll) 修改的主题。在制作[星际移民中心的星海航纪站点](http://interimm.org/magazine)的时候，做了一些汉化和修改。

部分 layouts 和 includes 预设了中英文两种模板。

沿用原作者的 MIT License. 

GitHub + [prose.io](http://prose.io) 可以像普通的带有数据库的博客（如Wordpress）等一样实现在线编辑在线发布。

[GitHub 上的项目地址在此](https://github.com/emptymalei/planets-jekyll)

-----

## 简要文档

### GitHub 上的设置

改为自己的站点，只需要 Fork [这个 repository](https://github.com/emptymalei/planets-jekyll)，然后将 repository 名称改为自己想要的名称。

> 一般而言，对于个人，想要使用 `username.github.io` 作为网站名称的，需要将 repository 改名为 `username.github.io` 并且将所有的文件放在 `master` 分支。GitHub 会自动将 `master` 分支中的 jekyll 内容编译为 html. 同样的道理，对于项目页面，jekyll 的源文件放在 `gh-pages` 分支中，GitHub 也会自动编译为 html 页面。

然后需要做以下修改：

- [ ] 按照上面的要求修改 repository 名称，并且将内容放在正确的分支中。
- [ ] 修改 `_config.yml` 中的内容，包括站点名称等等。其中 duoshuo 代码是需要去 http://duoshuo.com 注册一个账号并且创建一个网站的评论框，获取代号。
- [ ] 请替换现有的根目录下面的 favicon.ico, images 目录下的 logo-120x120.png，front-cover.jpg（显示在首页的背景图片） 等文件。`images/authors` 目录下的图像是用于作者头像，将头像放在这里，然后在下一步中更改配置文件。`images/mars` 目录中的文件是在示例 post 中用到的，可以删除。
- [ ] 在 `_data/authors.yml` 中修改作者列表（格式请参照文件中的例子 example）；在 `_data/footer.yml` 中修改网站底部的几个链接（可以添加，但是添加太多了就要换行了，不好看）；在 `_data/navigation.yml` 文件中修改站点顶部的链接（同时影响右侧边栏的滑出导航）。
- [ ] 其他的设置和自定义请阅读 jekyll 的官方文档。


> 如果你不了解 jekyll，简略说来：
> 
> 1. 所有的文章都在 `_posts` 目录下面。posts 的命名按照 jekyll 的要求，需要以日期格式开头。如果不这样命名，不会自动索引，但是依然会自动生成 html 页面，这时候需要手动索引。**我在目录中保留了几篇样稿，这样可以模仿格式，请在正式发布站点时删除。**
> 
> 2. `science`，`til`，`stories`，`history`，`club`，`about`，这些都是可以删除或者更改的文件目录。这些文件夹的名称是 post 的 category 名称，里面的 index.md 是索引页面，可以自己更改，我个人习惯在根目录建立这样的文件夹。也可以参考其他用法。
> 
> 3. `_posts` 目录中 posts 中的作者的代码需要与 `_data/authors.yml` 中的一致。例如在 `_posts` 目录中写了一篇名为 `2014-10-18-martian-sunset-phobos.md` 的新文章，其中 meta data 中设定作者为 `author: example` ，那么在 `_data/authors.yml` 中需要有 `example` 这个作者。
> 
> 4. 另外，所有的 html 文件会默认全部原封不动进入到 GitHub 生成的站点中。




### workflow

登录 prose.io，链接 GitHub 账号，开始写吧，就这么简单。prose.io 专门为基于 jekyll 的写作做了优化，例如在编辑区域不会看到 meta data，而是需要在右侧的边栏有个 meta data 的按钮，就像正常的 Wordpress 博客使用一样。



-----

以下是文章列表功能示例。请按照需要改更 `site.categories.xxx` 中的 `xxx`，`xxx` 需要与你的 `_posts` 目录中的文章的 metadata 中的 `categories` 对应起来。



## 近期科学

<div class="tiles">
{% for post in site.categories.science limit:5 %}
	{% include post-list-cn.html %}
{% endfor %}
</div><!-- /.tiles -->

<a href="./science/">查看所有科学（共 {{ site.categories.science.size }} 篇）</a>

## 近期故事

<div class="tiles">

{% for post in site.categories.stories limit:5 %}
	{% include post-list-cn.html %}
{% endfor %}

</div><!-- /.tiles -->



	{% if site.categories.stories.size %}
<a href="./stories/">查看所有故事（共 {{ site.categories.stories.size }} 篇）</a>
		{% else %}
暂无故事类文章
		{% endif %}


## 近期历史

<div class="tiles">
{% for post in site.categories.history limit:5 %}
	{% include post-list-cn.html %}
{% endfor %}
</div><!-- /.tiles -->



{% if site.categories.history.size %}
<a href="./history/">查看所有故事（共 {{ site.categories.history.size }} 篇）</a>
		{% else %}
暂无历史类文章
		{% endif %}

