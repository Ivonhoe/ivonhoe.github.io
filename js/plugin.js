/**
 * baiduTemplate简单好用的Javascript模板引擎 1.0.6 版本
 * http://baidufe.github.com/BaiduTemplate
 * 开源协议：BSD License
 * 浏览器环境占用命名空间 baidu.template ，nodejs环境直接安装 npm install baidutemplate
 * @param str{String} dom结点ID，或者模板string
 * @param data{Object} 需要渲染的json对象，可以为空。当data为{}时，仍然返回html。
 * @return 如果无data，直接返回编译后的函数；如果有data，返回html。
 * @author wangxiao 
 * @email 1988wangxiao@gmail.com
*/

;(function(window){

    //取得浏览器环境的baidu命名空间，非浏览器环境符合commonjs规范exports出去
    //修正在nodejs环境下，采用baidu.template变量名
    var baidu = typeof module === 'undefined' ? (window.baidu = window.baidu || {}) : module.exports;

    //模板函数（放置于baidu.template命名空间下）
    baidu.template = function(str, data){

        //检查是否有该id的元素存在，如果有元素则获取元素的innerHTML/value，否则认为字符串为模板
        var fn = (function(){

            //判断如果没有document，则为非浏览器环境
            if(!window.document){
                return bt._compile(str);
            };

            //HTML5规定ID可以由任何不包含空格字符的字符串组成
            var element = document.getElementById(str);
            if (element) {
                    
                //取到对应id的dom，缓存其编译后的HTML模板函数
                if (bt.cache[str]) {
                    return bt.cache[str];
                };

                //textarea或input则取value，其它情况取innerHTML
                var html = /^(textarea|input)$/i.test(element.nodeName) ? element.value : element.innerHTML;
                return bt._compile(html);

            }else{

                //是模板字符串，则生成一个函数
                //如果直接传入字符串作为模板，则可能变化过多，因此不考虑缓存
                return bt._compile(str);
            };

        })();

        //有数据则返回HTML字符串，没有数据则返回函数 支持data={}的情况
        var result = bt._isObject(data) ? fn( data ) : fn;
        fn = null;

        return result;
    };

    //取得命名空间 baidu.template
    var bt = baidu.template;

    //标记当前版本
    bt.versions = bt.versions || [];
    bt.versions.push('1.0.6');

    //缓存  将对应id模板生成的函数缓存下来。
    bt.cache = {};
    
    //自定义分隔符，可以含有正则中的字符，可以是HTML注释开头 <! !>
    bt.LEFT_DELIMITER = bt.LEFT_DELIMITER||'{%';
    bt.RIGHT_DELIMITER = bt.RIGHT_DELIMITER||'%}';

    //自定义默认是否转义，默认为默认自动转义
    bt.ESCAPE = true;

    //HTML转义
    bt._encodeHTML = function (source) {
        return String(source)
            .replace(/&/g,'&amp;')
            .replace(/</g,'&lt;')
            .replace(/>/g,'&gt;')
            .replace(/\\/g,'&#92;')
            .replace(/"/g,'&quot;')
            .replace(/'/g,'&#39;');
    };

    //转义影响正则的字符
    bt._encodeReg = function (source) {
        return String(source).replace(/([.*+?^=!:${}()|[\]/\\])/g,'\\$1');
    };

    //转义UI UI变量使用在HTML页面标签onclick等事件函数参数中
    bt._encodeEventHTML = function (source) {
        return String(source)
            .replace(/&/g,'&amp;')
            .replace(/</g,'&lt;')
            .replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;')
            .replace(/'/g,'&#39;')
            .replace(/\\\\/g,'\\')
            .replace(/\\\//g,'\/')
            .replace(/\\n/g,'\n')
            .replace(/\\r/g,'\r');
    };

    //将字符串拼接生成函数，即编译过程(compile)
    bt._compile = function(str){
        var funBody = "var _template_fun_array=[];\nvar fn=(function(__data__){\nvar _template_varName='';\nfor(name in __data__){\n_template_varName+=('var '+name+'=__data__[\"'+name+'\"];');\n};\neval(_template_varName);\n_template_fun_array.push('"+bt._analysisStr(str)+"');\n_template_varName=null;\n})(_template_object);\nfn = null;\nreturn _template_fun_array.join('');\n";
        return new Function("_template_object",funBody);
    };

    //判断是否是Object类型
    bt._isObject = function (source) {
        return 'function' === typeof source || !!(source && 'object' === typeof source);
    };

    //解析模板字符串
    bt._analysisStr = function(str){

        //取得分隔符
        var _left_ = bt.LEFT_DELIMITER;
        var _right_ = bt.RIGHT_DELIMITER;

        //对分隔符进行转义，支持正则中的元字符，可以是HTML注释 <!  !>
        var _left = bt._encodeReg(_left_);
        var _right = bt._encodeReg(_right_);

        str = String(str)
            
            //去掉分隔符中js注释
            .replace(new RegExp("("+_left+"[^"+_right+"]*)//.*\n","g"), "$1")

            //去掉注释内容  <%* 这里可以任意的注释 *%>
            //默认支持HTML注释，将HTML注释匹配掉的原因是用户有可能用 <! !>来做分割符
            .replace(new RegExp("<!--.*?-->", "g"),"")
            .replace(new RegExp(_left+"\\*.*?\\*"+_right, "g"),"")

            //把所有换行去掉  \r回车符 \t制表符 \n换行符
            .replace(new RegExp("[\\r\\t\\n]","g"), "")

            //用来处理非分隔符内部的内容中含有 斜杠 \ 单引号 ‘ ，处理办法为HTML转义
            .replace(new RegExp(_left+"(?:(?!"+_right+")[\\s\\S])*"+_right+"|((?:(?!"+_left+")[\\s\\S])+)","g"),function (item, $1) {
                var str = '';
                if($1){

                    //将 斜杠 单引 HTML转义
                    str = $1.replace(/\\/g,"&#92;").replace(/'/g,'&#39;');
                    while(/<[^<]*?&#39;[^<]*?>/g.test(str)){

                        //将标签内的单引号转义为\r  结合最后一步，替换为\'
                        str = str.replace(/(<[^<]*?)&#39;([^<]*?>)/g,'$1\r$2')
                    };
                }else{
                    str = item;
                }
                return str ;
            });


        str = str 
            //定义变量，如果没有分号，需要容错  <%var val='test'%>
            .replace(new RegExp("("+_left+"[\\s]*?var[\\s]*?.*?[\\s]*?[^;])[\\s]*?"+_right,"g"),"$1;"+_right_)

            //对变量后面的分号做容错(包括转义模式 如<%:h=value%>)  <%=value;%> 排除掉函数的情况 <%fun1();%> 排除定义变量情况  <%var val='test';%>
            .replace(new RegExp("("+_left+":?[hvu]?[\\s]*?=[\\s]*?[^;|"+_right+"]*?);[\\s]*?"+_right,"g"),"$1"+_right_)

            //按照 <% 分割为一个个数组，再用 \t 和在一起，相当于将 <% 替换为 \t
            //将模板按照<%分为一段一段的，再在每段的结尾加入 \t,即用 \t 将每个模板片段前面分隔开
            .split(_left_).join("\t");

        //支持用户配置默认是否自动转义
        if(bt.ESCAPE){
            str = str

                //找到 \t=任意一个字符%> 替换为 ‘，任意字符,'
                //即替换简单变量  \t=data%> 替换为 ',data,'
                //默认HTML转义  也支持HTML转义写法<%:h=value%>  
                .replace(new RegExp("\\t=(.*?)"+_right,"g"),"',typeof($1) === 'undefined'?'':baidu.template._encodeHTML($1),'");
        }else{
            str = str
                
                //默认不转义HTML转义
                .replace(new RegExp("\\t=(.*?)"+_right,"g"),"',typeof($1) === 'undefined'?'':$1,'");
        };

        str = str

            //支持HTML转义写法<%:h=value%>  
            .replace(new RegExp("\\t:h=(.*?)"+_right,"g"),"',typeof($1) === 'undefined'?'':baidu.template._encodeHTML($1),'")

            //支持不转义写法 <%:=value%>和<%-value%>
            .replace(new RegExp("\\t(?::=|-)(.*?)"+_right,"g"),"',typeof($1)==='undefined'?'':$1,'")

            //支持url转义 <%:u=value%>
            .replace(new RegExp("\\t:u=(.*?)"+_right,"g"),"',typeof($1)==='undefined'?'':encodeURIComponent($1),'")

            //支持UI 变量使用在HTML页面标签onclick等事件函数参数中  <%:v=value%>
            .replace(new RegExp("\\t:v=(.*?)"+_right,"g"),"',typeof($1)==='undefined'?'':baidu.template._encodeEventHTML($1),'")

            //将字符串按照 \t 分成为数组，在用'); 将其合并，即替换掉结尾的 \t 为 ');
            //在if，for等语句前面加上 '); ，形成 ');if  ');for  的形式
            .split("\t").join("');")

            //将 %> 替换为_template_fun_array.push('
            //即去掉结尾符，生成函数中的push方法
            //如：if(list.length=5){%><h2>',list[4],'</h2>');}
            //会被替换为 if(list.length=5){_template_fun_array.push('<h2>',list[4],'</h2>');}
            .split(_right_).join("_template_fun_array.push('")

            //将 \r 替换为 \
            .split("\r").join("\\'");

        return str;
    };

})(window);

!function(t){if("object"==typeof exports)module.exports=t();else if("function"==typeof define&&define.amd)define(t);else{var r;"undefined"!=typeof window?r=window:"undefined"!=typeof global?r=global:"undefined"!=typeof self&&(r=self),r.GeoPattern=t()}}(function(){return function t(r,s,e){function i(o,a){if(!s[o]){if(!r[o]){var h="function"==typeof require&&require;if(!a&&h)return h(o,!0);if(n)return n(o,!0);throw new Error("Cannot find module '"+o+"'")}var l=s[o]={exports:{}};r[o][0].call(l.exports,function(t){var s=r[o][1][t];return i(s?s:t)},l,l.exports,t,r,s,e)}return s[o].exports}for(var n="function"==typeof require&&require,o=0;o<e.length;o++)i(e[o]);return i}({1:[function(t,r){r.exports=t("./lib/")},{"./lib/":3}],2:[function(t,r){"use strict";function s(t){var r=/^#?([a-f\d])([a-f\d])([a-f\d])$/i;t=t.replace(r,function(t,r,s,e){return r+r+s+s+e+e});var s=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(t);return s?{r:parseInt(s[1],16),g:parseInt(s[2],16),b:parseInt(s[3],16)}:null}function e(t){return"#"+["r","g","b"].map(function(r){return("0"+t[r].toString(16)).slice(-2)}).join("")}function i(t){var r=t.r,s=t.g,e=t.b;r/=255,s/=255,e/=255;var i,n,o=Math.max(r,s,e),a=Math.min(r,s,e),h=(o+a)/2;if(o===a)i=n=0;else{var l=o-a;switch(n=h>.5?l/(2-o-a):l/(o+a),o){case r:i=(s-e)/l+(e>s?6:0);break;case s:i=(e-r)/l+2;break;case e:i=(r-s)/l+4}i/=6}return{h:i,s:n,l:h}}function n(t){function r(t,r,s){return 0>s&&(s+=1),s>1&&(s-=1),1/6>s?t+6*(r-t)*s:.5>s?r:2/3>s?t+(r-t)*(2/3-s)*6:t}var s,e,i,n=t.h,o=t.s,a=t.l;if(0===o)s=e=i=a;else{var h=.5>a?a*(1+o):a+o-a*o,l=2*a-h;s=r(l,h,n+1/3),e=r(l,h,n),i=r(l,h,n-1/3)}return{r:Math.round(255*s),g:Math.round(255*e),b:Math.round(255*i)}}r.exports={hex2rgb:s,rgb2hex:e,rgb2hsl:i,hsl2rgb:n,rgb2rgbString:function(t){return"rgb("+[t.r,t.g,t.b].join(",")+")"}}},{}],3:[function(t,r){!function(s){"use strict";function e(t){return function(r,s){return"object"==typeof r&&(s=r,r=null),(null===r||void 0===r)&&(r=(new Date).toString()),s||(s={}),t.call(this,r,s)}}var i=t("./pattern"),n=r.exports={generate:e(function(t,r){return new i(t,r)})};s&&(s.fn.geopattern=e(function(t,r){return this.each(function(){var e=s(this).attr("data-title-sha");e&&(r=s.extend({hash:e},r));var i=n.generate(t,r);s(this).css("background-image",i.toDataUrl())})}))}("undefined"!=typeof jQuery?jQuery:null)},{"./pattern":4}],4:[function(t,r){(function(s){"use strict";function e(t,r,s){return parseInt(t.substr(r,s||1),16)}function i(t,r,s,e,i){var n=parseFloat(t),o=s-r,a=i-e;return(n-r)*a/o+e}function n(t){return t%2===0?C:j}function o(t){return i(t,0,15,M,W)}function a(t){var r=t,s=r/2,e=Math.sin(60*Math.PI/180)*r;return[0,e,s,0,s+r,0,2*r,e,s+r,2*e,s,2*e,0,e].join(",")}function h(t,r){var s=.66*r;return[[0,0,t/2,r-s,t/2,r,0,s,0,0],[t/2,r-s,t,0,t,s,t/2,r,t/2,r-s]].map(function(t){return t.join(",")})}function l(t){return[[t,0,t,3*t],[0,t,3*t,t]]}function c(t){var r=t,s=.33*r;return[s,0,r-s,0,r,s,r,r-s,r-s,r,s,r,0,r-s,0,s,s,0].join(",")}function f(t,r){var s=t/2;return[s,0,t,r,0,r,s,0].join(",")}function u(t,r){return[t/2,0,t,r/2,t/2,r,0,r/2].join(",")}function p(t){return[0,0,t,t,0,t,0,0].join(",")}function g(t,r,s,e,i){var a=p(e),h=o(i[0]),l=n(i[0]),c={stroke:S,"stroke-opacity":A,"fill-opacity":h,fill:l};t.polyline(a,c).transform({translate:[r+e,s],scale:[-1,1]}),t.polyline(a,c).transform({translate:[r+e,s+2*e],scale:[1,-1]}),h=o(i[1]),l=n(i[1]),c={stroke:S,"stroke-opacity":A,"fill-opacity":h,fill:l},t.polyline(a,c).transform({translate:[r+e,s+2*e],scale:[-1,-1]}),t.polyline(a,c).transform({translate:[r+e,s],scale:[1,1]})}function v(t,r,s,e,i){var a=o(i),h=n(i),l=p(e),c={stroke:S,"stroke-opacity":A,"fill-opacity":a,fill:h};t.polyline(l,c).transform({translate:[r,s+e],scale:[1,-1]}),t.polyline(l,c).transform({translate:[r+2*e,s+e],scale:[-1,-1]}),t.polyline(l,c).transform({translate:[r,s+e],scale:[1,1]}),t.polyline(l,c).transform({translate:[r+2*e,s+e],scale:[-1,1]})}function y(t,r){var s=t/2;return[0,0,r,s,0,t,0,0].join(",")}var d=t("extend"),b=t("./color"),m=t("./sha1"),k=t("./svg"),x={baseColor:"#933c3c"},w=["octogons","overlappingCircles","plusSigns","xes","sineWaves","hexagons","overlappingRings","plaid","triangles","squares","concentricCircles","diamonds","tessellation","nestedSquares","mosaicSquares","chevrons"],j="#222",C="#ddd",S="#000",A=.02,M=.02,W=.15,H=r.exports=function(t,r){return this.opts=d({},x,r),this.hash=r.hash||m(t),this.svg=new k,this.generateBackground(),this.generatePattern(),this};H.prototype.toSvg=function(){return this.svg.toString()},H.prototype.toString=function(){return this.toSvg()},H.prototype.toBase64=function(){var t,r=this.toSvg();return t="undefined"!=typeof window&&"function"==typeof window.btoa?window.btoa(r):new s(r).toString("base64")},H.prototype.toDataUri=function(){return"data:image/svg+xml;base64,"+this.toBase64()},H.prototype.toDataUrl=function(){return'url("'+this.toDataUri()+'")'},H.prototype.generateBackground=function(){var t,r,s,n;this.opts.color?s=b.hex2rgb(this.opts.color):(r=i(e(this.hash,14,3),0,4095,0,359),n=e(this.hash,17),t=b.rgb2hsl(b.hex2rgb(this.opts.baseColor)),t.h=(360*t.h-r+360)%360/360,t.s=n%2===0?Math.min(1,(100*t.s+n)/100):Math.max(0,(100*t.s-n)/100),s=b.hsl2rgb(t)),this.color=b.rgb2hex(s),this.svg.rect(0,0,"100%","100%",{fill:b.rgb2rgbString(s)})},H.prototype.generatePattern=function(){var t=this.opts.generator;if(t){if(w.indexOf(t)<0)throw new Error("The generator "+t+" does not exist.")}else t=w[e(this.hash,20)];return this["geo"+t.slice(0,1).toUpperCase()+t.slice(1)]()},H.prototype.geoHexagons=function(){var t,r,s,h,l,c,f,u,p=e(this.hash,0),g=i(p,0,15,8,60),v=g*Math.sqrt(3),y=2*g,d=a(g);for(this.svg.setWidth(3*y+3*g),this.svg.setHeight(6*v),s=0,u=0;6>u;u++)for(f=0;6>f;f++)c=e(this.hash,s),t=f%2===0?u*v:u*v+v/2,h=o(c),r=n(c),l={fill:r,"fill-opacity":h,stroke:S,"stroke-opacity":A},this.svg.polyline(d,l).transform({translate:[f*g*1.5-y/2,t-v/2]}),0===f&&this.svg.polyline(d,l).transform({translate:[6*g*1.5-y/2,t-v/2]}),0===u&&(t=f%2===0?6*v:6*v+v/2,this.svg.polyline(d,l).transform({translate:[f*g*1.5-y/2,t-v/2]})),0===f&&0===u&&this.svg.polyline(d,l).transform({translate:[6*g*1.5-y/2,5*v+v/2]}),s++},H.prototype.geoSineWaves=function(){var t,r,s,a,h,l,c,f=Math.floor(i(e(this.hash,0),0,15,100,400)),u=Math.floor(i(e(this.hash,1),0,15,30,100)),p=Math.floor(i(e(this.hash,2),0,15,3,30));for(this.svg.setWidth(f),this.svg.setHeight(36*p),r=0;36>r;r++)l=e(this.hash,r),s=o(l),t=n(l),c=f/4*.7,h={fill:"none",stroke:t,opacity:s,"stroke-width":""+p+"px"},a="M0 "+u+" C "+c+" 0, "+(f/2-c)+" 0, "+f/2+" "+u+" S "+(f-c)+" "+2*u+", "+f+" "+u+" S "+(1.5*f-c)+" 0, "+1.5*f+", "+u,this.svg.path(a,h).transform({translate:[-f/4,p*r-1.5*u]}),this.svg.path(a,h).transform({translate:[-f/4,p*r-1.5*u+36*p]})},H.prototype.geoChevrons=function(){var t,r,s,a,l,c,f,u=i(e(this.hash,0),0,15,30,80),p=i(e(this.hash,0),0,15,30,80),g=h(u,p);for(this.svg.setWidth(6*u),this.svg.setHeight(6*p*.66),r=0,f=0;6>f;f++)for(c=0;6>c;c++)l=e(this.hash,r),s=o(l),t=n(l),a={stroke:S,"stroke-opacity":A,fill:t,"fill-opacity":s,"stroke-width":1},this.svg.group(a).transform({translate:[c*u,f*p*.66-p/2]}).polyline(g).end(),0===f&&this.svg.group(a).transform({translate:[c*u,6*p*.6