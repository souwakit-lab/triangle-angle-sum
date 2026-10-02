(function(){

    var REGISTER_LOCATION="https://www.netpad.net.cn/h5Open/register"
    Date.prototype.format = function(fmt) {
        var o = {
            "M+" : this.getMonth()+1,                 //月份
            "d+" : this.getDate(),                    //日
            "h+" : this.getHours(),                   //小时
            "m+" : this.getMinutes(),                 //分
            "s+" : this.getSeconds(),                 //秒
            "q+" : Math.floor((this.getMonth()+3)/3), //季度
            "S"  : this.getMilliseconds()             //毫秒
        };
        if(/(y+)/.test(fmt)) {
            fmt=fmt.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length));
        }
        for(var k in o) {
            if(new RegExp("("+ k +")").test(fmt)){
                fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length)));
            }
        }
        return fmt;
    };

    function Base64(key) {

        // private property
        this.key = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        // public method for decoding
        this.decode = function (input) {

            var output = "";
            var chr1, chr2, chr3;
            var enc1, enc2, enc3, enc4;
            var i = 0;
            input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
            while (i < input.length) {
                enc1 = this.key.indexOf(input.charAt(i++));
                enc2 = this.key.indexOf(input.charAt(i++));
                enc3 = this.key.indexOf(input.charAt(i++));
                enc4 = this.key.indexOf(input.charAt(i++));
                chr1 = (enc1 << 2) | (enc2 >> 4);
                chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                chr3 = ((enc3 & 3) << 6) | enc4;
                output = output + String.fromCharCode(chr1);
                if (enc3 != 64) {
                    output = output + String.fromCharCode(chr2);
                }
                if (enc4 != 64) {
                    output = output + String.fromCharCode(chr3);
                }
            }
            output = _utf8_decode(output);
            return output;
        };
        // private method for UTF-8 decoding
        function _utf8_decode(utftext) {
            var string = "";
            var i = 0;
            var c1,c2,c3;
            var c = c1 = c2 = 0;
            while ( i < utftext.length ) {
                c = utftext.charCodeAt(i);
                if (c < 128) {
                    string += String.fromCharCode(c);
                    i++;
                } else if((c > 191) && (c < 224)) {
                    c2 = utftext.charCodeAt(i+1);
                    string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                    i += 2;
                } else {
                    c2 = utftext.charCodeAt(i+1);
                    c3 = utftext.charCodeAt(i+2);
                    string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                    i += 3;
                }
            }
            return string;
        }
    }
    function getCurrentTime() {
        return new Date().format("yyyy-MM-dd hh:mm:ss")
    }

    //工具函数，获取url中的参数值
    function getQueryString(name) {
        //var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
        var reg = new RegExp("([\?&]?)" + name + "=([^&]*)([\?&]?)", "i");
        var r = window.location.search.substr(1).match(reg)
            || window.location.hash.substr(1).match(reg);
        if (r != null) return unescape(r[2]);
        return null;
    }
    function isonLine(){
        return window.navigator.onLine;
    }
    function decodeCode(code,appid){
        return  new Base64().decode(code);
    }
    function verifyCode(code,appid){
        var str=decodeCode(code,appid);
        if(!str) throw "str is null";
        var data=JSON.parse(str);
        if(data.appid!==appid) throw "appid 不一致";
        if(data.validTime!=="forever"){
            if(new Date().getTime()>parseInt(data.validTime)) throw "code 已经过期"
        }
    }
    function register(appid,id){
        if(!isonLine()) return;
        var script_ele = document.createElement('script');
        script_ele.setAttribute('src',REGISTER_LOCATION+'?appid='+appid+'&id='+id+'&timestamp='+new Date().getTime());
        document.getElementsByTagName('body')[0].appendChild(script_ele);
    }
    function loadNetpad(content){
        var dom = document.getElementById("content");
        new np.PreviewManager(dom).loadFromJSON(content)
    }

    $(document).ready(function () {
        try{
            var data = JSON.parse(decodeURI($("body").data("load-data")));
            var appid= $("body").data("load-appid");
            var id= $("body").data("load-originid");
            var isneedcode=$("body").data("load-isneedcode");
            if(isneedcode){
                var code=getQueryString("code");
                if(!code) throw "code 不存在";
                verifyCode(code,appid);
            }
            $("#loading").hide();
            loadNetpad(data);
            register(appid,id);
        }catch (err) {
            console.warn(err);
            alert("出错了："+err.toString())
        }

    })

})();