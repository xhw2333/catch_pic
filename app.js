// 最终版爬虫，下载到本地
const fs = require('fs');
const path = require('path');
const urldm = require('url');
var cheerio = require('cheerio')
var request = require('request')
const async = require('async');
const iconv = require('iconv-lite');

// 要爬取的页面数
const len = 50;


// 首先定义配置
var options = {
    uri: 'https://pic.netbian.com/4kdongman/index',
    dir: './out/', //保存目录
    downLimit: 2//图片并行下载上限
}

/**
 * @description: 获取每个页面的地址
 * @param {*} len 页面数
 * @return {*} 地址数组
 */
var getPageUrl = function (len) {
    let l = [options.uri + '.html'];
    let cont = 10;
    for (let i = 0; i < len; i++) {
        l.push(options.uri + '_' + cont + '.html')
        cont += 1;
    }
    return l;
}

// 获取图片地址
var getSrc = function (div) {
    var e = cheerio.load(div, { decodeEntities: false });
    var src = 'https://pic.netbian.com' + e('img').attr('src');
    return src;
}

/**
 * 开始下载
 */
function start() {
    console.log('start');
    //url地址
    var opts = getPageUrl(len);
    //串行抓取页面
    async.forEachSeries(opts, function (opt, callback) {
        //抓当个页面
        parsePage(opt, (err) => { callback() });
    }, function (err) {
        if (err) {
            console.log('error: %s'.error, err.message);
        } else {
            console.log('success: 下载完毕'.info);
        }
    });

}
//抓单个页面
function parsePage(url, callback) {
    request(url, function (error, response, body) {
        console.log(url, response.statusCode);
        if (!error && response.statusCode == 200) {
            //如果页面是GBK 所以使用模块iconv来转码
            // var str = iconv.decode(body, 'gbk');
            //将字符串装换为DOM
            // var $ = cheerio.load(str);
            var links = [];

            var e = cheerio.load(body, { decodeEntities: false });
            var Div = e('.slist>ul>li');
            for (let i = 0; i < Div.length; i++) {
                let picSrc = getSrc(Div[i]);
                links.push(picSrc);
            }

            //下载图片
            downImages(options.dir, links, callback);

        }
    });
}


/**
 * 下载图片列表中的图片
 */
function downImages(dir, links, callback) {
    console.log('发现%d张图片，准备开始下载...', links.length);
    //eachLimits 控制下载图片并行上限 第二个参数 options.downLimit 就是配置
    async.eachLimit(links, options.downLimit, function (imgsrc, cb) {
        var url = urldm.parse(imgsrc);
        //获取url最后的名字
        var fileName = path.basename(url.pathname);
        //去掉/
        var toPath = path.join(dir, fileName);
        console.log('开始下载图片：%s，保存到：%s', fileName, dir);

        request(encodeURI(imgsrc)).on('error', function (err) {
            cb();
        }).pipe(fs.createWriteStream(toPath)).on('finish', () => {
            console.log('图片下载成功：%s', imgsrc);
            cb();
        })
    }, callback);

}


start();