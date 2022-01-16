let searchInputElement = document.getElementById("search-input");
let searchResultElement = document.getElementById("search-result");

// 申明保存文章的标题、链接、内容的数组变量
let arrItems = [],
    arrContents = [],
    arrLinks = [],
    arrTitles = [],
    arrResults = [],
    indexItem = [];

// ajax 的兼容写法
let xhr = new XMLHttpRequest() || new ActiveXObject('Microsoft.XMLHTTP');
xhr.onreadystatechange = function () {
    if (xhr.readyState === 4 && xhr.status === 200) {
        arrItems = xhr.responseXML.getElementsByTagName('item');
        // 遍历并保存所有文章对应的标题、链接、内容到对应的数组中，同时过滤掉 HTML 标签
        for (let i = 0; i < arrItems.length; i++) {
            arrContents[i] = arrItems[i].getElementsByTagName('content')[0].textContent.replace(/<.*?>/g, '');
            arrLinks[i] = arrItems[i].getElementsByTagName('link')[0].textContent.replace(/<.*?>/g, '');
            arrTitles[i] = arrItems[i].getElementsByTagName('title')[0].textContent.replace(/<.*?>/g, '');
        }
    }
};

// 获取 feed.xml 文件数据
xhr.open('get', '/rss.xml', true);
xhr.send();

searchInputElement.oninput = function () {
    setTimeout(searchConfirm, 0);
};

searchInputElement.onkeydown = function () {
    setTimeout(searchConfirm, 0);
};

searchInputElement.onfocus = function () {
    searchResultElement.style.display = 'block';
};

function searchConfirm() {
    console.log(searchInputElement.value)
    if (searchInputElement.value === '') {
        searchResultElement.style.display = 'none';
        searchInit();
    } else if (searchInputElement.value.search(/^\s+$/) >= 0) {
        // 检测输入值全是空白的情况
        searchInit();
    } else {
        searchInit();
        // searchValue = searchInputElement.value;
        searching(arrTitles, arrContents, searchInputElement.value);
    }
}

// 每次搜索完成后的初始化
function searchInit() {
    document.getElementById("search-result-title").innerHTML = '共找到 0 篇文章';
    arrResults = [];
    indexItem = [];
    searchResultElement.innerHTML = '';
    searchResultElement.style.display = 'block';
}

function searching(titles, contents, input) {
    input = new RegExp(input, 'i');
    for (let i = 0; i < arrItems.length; i++) {
        if (titles[i].search(input) !== -1 || contents[i].search(input) !== -1) {
            let arr = contents;
            indexItem.push(i);  // 保存匹配值的索引
            let indexContent = arr[i].search(input);
            // 此时 input 为 RegExp 格式 /input/i，转换为原 input 字符串长度
            let l = input.toString().length - 3;
            let step = 120;

            // 将匹配到内容的地方进行黄色标记，并包括周围一定数量的文本
            arrResults.push('<p>' +
                arr[i].slice(indexContent - step, indexContent) +
                '<mark>' + arr[i].slice(indexContent, indexContent + l) + '</mark>' +
                arr[i].slice(indexContent + l, indexContent + l + step) + '</p>'
            );
        }
    }

    document.getElementById("search-result-title").innerHTML = '共找到 <span>' + indexItem.length + '</span> 篇文章';

    for (let i = 0; i < arrResults.length; i++) {
        let li = document.createElement('li');
        li.innerHTML = '<li>' +
            '<a class="extra" target="_blank" href= '+ arrLinks[indexItem[i]] +'>' + arrResults[i] + '</a>' +
            '</li>' + '<hr style="1px dashed #999" />';

        document.getElementById("search-result").appendChild(li);
    }
}