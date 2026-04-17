(function (w) {
	w.URLSearchParams = w.URLSearchParams || function (searchString) {
		var self = this;
		self.searchString = searchString;
		self.get = function (name) {
			var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(self.searchString);
			if (results == null) {
				return null;
			} else {
				return decodeURI(results[1]) || 0;
			}
		};
	};
})(window);

var urlParams = new URLSearchParams(window.location.search);

var nextComment = null;
var runtimeEnv = window.__YTB_ENV__ || {};
var roomID = runtimeEnv.sessionId || "test";

if (urlParams.has("session")){
	roomID = urlParams.get("session");
	try{
		localStorage.setItem("overlay_room_id", roomID);
	} catch(e){}
} else if (urlParams.has("s")){
	roomID = urlParams.get("s");
	try{
		localStorage.setItem("overlay_room_id", roomID);
	} catch(e){}
} else {
	try{
		roomID = localStorage.getItem("overlay_room_id") || roomID;
	} catch(e){}
}

if (urlParams.has("chroma")){
	var chroma = urlParams.get("chroma") || "0F0";
	document.body.style.backgroundColor = "#" + chroma;
} else if (urlParams.has("transparent")){
	document.body.style.backgroundColor = "#000";
}

var centering = false;
if (urlParams.has("center")){
	centering = true;
}

var timeoutDelay = false;
if (urlParams.has("showtime")){
	timeoutDelay = parseInt(urlParams.get("showtime")) || 20000;
}
var timeoutTimer = null;

var isIFrame = false;
if (parent && (window.location !== window.parent.location)) {
	isIFrame = true;
}

function realign(){
	if (centering){
		try{
			var offsetLeft = (parseInt(window.innerWidth) - parseInt(document.getElementById("message").clientWidth)) / 2;
			document.documentElement.style.setProperty("--highlight-chat-left", offsetLeft + "px");
			console.log(offsetLeft);
		} catch(e){}
	}
	try {
		var img = document.getElementById("img");
		if (!img){return;}
		var width = img.clientWidth + 214;
		var message = document.getElementById("message");
		if (message.innerText.length){
			message.style.width = "calc(100vw - " + width + "px)";
			document.getElementById("imgContent").style.right = "unset";
			document.getElementById("imgContent").style.left = (document.getElementById("message").clientWidth + 19) + "px";
		} else {
			message.style.maxWidth = "300px";
			document.getElementById("imgContent").style.right = 0;
			document.getElementById("imgContent").style.left = "300px";
		}
	} catch(e){console.warn(e);}
}

window.onresize = realign;

function applySettings(item){
	console.log(item);

	var color = "#000";
	if(item.color) {
		color = item.color;
	}
	if (item.streamID){
		channel = item.streamID;
	}

	let root = document.documentElement;
	root.style.setProperty("--keyer-bg-color", color);

	if(item.authorBackgroundColor) {
		root.style.setProperty("--author-bg-color", item.authorBackgroundColor);
		root.style.setProperty("--author-avatar-border-color", item.authorBackgroundColor);
	}
	if(item.authorAvatarBorderColor) {
		root.style.setProperty("--author-avatar-border-color", item.authorAvatarBorderColor);
	}
	if(item.commentBackgroundColor) {
		root.style.setProperty("--comment-bg-color", item.commentBackgroundColor);
	}
	if(item.authorColor) {
		root.style.setProperty("--author-color", item.authorColor);
	}
	if(item.commentColor) {
		root.style.setProperty("--comment-color", item.commentColor);
	}
	if(item.fontFamily) {
		root.style.setProperty("--font-family", item.fontFamily);
	}
	if(item.commentBottom) {
		root.style.setProperty("--comment-area-bottom", item.commentBottom);
	}
	if(item.commentHeight) {
		root.style.setProperty("--comment-area-height", item.commentHeight);
	}
	if(item.sizeOffset) {
		root.style.setProperty("--comment-area-size-offset", item.sizeOffset);
	}
	showOnlyFirstName = item.showOnlyFirstName;
	highlightWords = item.highlightWords;
}

try{
	if (parseInt(window.innerHeight) < 500){
		document.documentElement.style.setProperty("--image-content-max-height", window.innerHeight);
	}
}catch(e){console.error(e);}

function getChromeVersion() {
	var raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
	return raw ? parseInt(raw[2], 10) : false;
}

var tmpImage = new Image();
tmpImage.src = "unknown.png";

var idle = null;
var conCon = 1;

function setupSocket(){
	socket.onclose = function (){
		setTimeout(function(){
			conCon += 1;
			socket = new WebSocket(getOverlaySocketUrl());
			setupSocket();
		}, 100 * conCon);
	};
	socket.onopen = function (){
		conCon = 1;
		socket.send(JSON.stringify({"join":roomID}));
	};
	socket.addEventListener('message', function (event) {
		if (event.data){
			var data = JSON.parse(event.data);
			if (data && data.feed){
				return;
			}
			if (!("contents" in data)){
				data.contents = data;
			}
			processEvent(data);
		}
	});
}

function getOverlaySocketUrl() {
	var params = new URLSearchParams(window.location.search);
	var explicit = params.get("ws");
	if (explicit) {
		return explicit;
	}

	var runtimeSocket = runtimeEnv.overlayWsUrl || window.__OVERLAY_WS_URL__;
	if (runtimeSocket) {
		return runtimeSocket;
	}

	var protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
	return protocol + "//" + window.location.host + "/ws";
}

var socket = new WebSocket(getOverlaySocketUrl());
setupSocket();
if (roomID.length === 10){
	console.error("Old versions of this app are no longer supported. Please go to ytb.ericklucioh.com and update your extension to the newest version if having issues");
}

var iframeTimeout = null;

function processEvent(data){
	var settings = false;
	if (data.settings){
		settings = data.settings;
	}

	if (data.contents){
		if (data.contents.chatimg){
			var tmpImage = new Image();
			tmpImage.src = data.contents.chatimg;
		} else {
			data.contents.chatimg = "unknown.png";
		}
	}

	if (data.contents){
		clearTimeout(timeoutTimer);
		document.getElementById("output").classList.add("fadeout");
		clearTimeout(nextComment);

		if (isIFrame){
			clearTimeout(iframeTimeout);
			iframeTimeout = setTimeout(function(){parent.postMessage({resizeWindow:{height:"220px"}}, "*");}, 300);
		}

		nextComment = setTimeout(function(settings, data){
			if (settings){
				applySettings(settings);
			}

			if (data.type && (data.type=="poll")){
				processPoll(data);
				return;
			}
			if (!data.type){
				data.type = "";
			}

			var addImage = "";
			if (data.contentimg){
				 addImage = '<div id="imgContent" class="hl-imgContent"><img id="img" src="' + data.contentimg + '" onerror="this.parentNode.style.display=\'none\'" onload="realign();"/></div>';
			} else {
				data.contentimg = "";
			}

			if (data.chatmessage && (getChromeVersion()>=95)){
				if (/(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/gi.test(data.chatmessage)){
					 data.chatmessage = "<span style='font-weight:400;'>" + data.chatmessage + "</font>";
				}
			}

			if (!data.chatbadges){
				data.chatbadges = "";
			}
			if (!data.chatname){
				data.chatname = "";
			}
			if (!data.backgroundColor){
				data.backgroundColor = "";
			}
			if (!data.textColor){
				data.textColor = "";
			}
			if (!data.chatmessage){
				data.chatmessage = "";
			}
			if (!data.hasDonation){
				data.hasDonation = "";
			}
			if (!data.hasMembership){
				data.hasMembership = "";
			}

			document.getElementById("output").innerHTML = renderChatMarkup(data, addImage);

			var fontsize = "";
			var limitchar = parseInt(window.innerWidth/6.5);

			if (!data.chatname && !data.chatbadges){
				document.querySelector("#nameDIV").style.display = "none";
			}

			if (document.getElementById("message").innerText.length>limitchar){
				fontsize = (parseInt((limitchar*100)/document.getElementById("message").innerText.length));
				if (fontsize<43){fontsize=43;}
				document.getElementById("message").style = data.backgroundColor +' '+ data.textColor+'; font-size: '+fontsize+'%;';
			}

			if (centering){
				try{
					var offsetLeft = (parseInt(window.innerWidth) - parseInt(document.getElementById("message").clientWidth))/2;
					document.documentElement.style.setProperty("--highlight-chat-left", offsetLeft+"px");
					console.log(offsetLeft);
				} catch(e){}
			}

			var msgImg = document.querySelectorAll("#message img");
			for (i = 0; i < msgImg.length; i++) {
				msgImg[i].onerror = function(){
					if (this.parentNode.classList.contains("hl-name") && this.alt){
						this.outerHTML = this.alt;
					} else if (this.alt.length!==2){
						this.style.display='none';
					} else {
						this.outerHTML = this.alt;
					}
				};
			}
			document.getElementById("output").classList.remove("fadeout");

			if (timeoutDelay){
				clearTimeout(timeoutTimer);
				timeoutTimer = setTimeout(function(){
					document.getElementById("output").classList.add("fadeout");
					clearTimeout(nextComment);
				}, timeoutDelay);
			}

		}, 500, settings, data.contents);
	} else {
		if ("contents" in data){
			clearTimeout(timeoutTimer);
			document.getElementById("output").classList.add("fadeout");
			clearTimeout(nextComment);
			if (settings){
				nextComment = setTimeout(function(settings){
					if (settings){
						applySettings(settings);
					}
				}, 500, settings);
			}

			if (isIFrame){
				clearTimeout(iframeTimeout);
				iframeTimeout = setTimeout(function(){parent.postMessage({resizeWindow:{height:"0px"}}, "*");},300);
			}

		} else if (settings){
			applySettings(settings);
		}
	}
}

function processPoll(data){
	if (!data.answers){
		data.answers=[];
	}
	console.log(data);
	document.getElementById("output").innerHTML = renderPollMarkup(data);

	document.getElementById("output").classList.remove("fadeout");

	if (timeoutDelay){
		clearTimeout(timeoutTimer);
		timeoutTimer = setTimeout(function(){
			document.getElementById("output").classList.add("fadeout");
			clearTimeout(nextComment);
		}, timeoutDelay);
	}
}

function renderChatMarkup(data, addImage){
	return '<div class="hl-c-cont highlight-chat">'
		+ '<div class="hl-name" id="nameDIV">' + data.chatname
		+ '<div class="hl-badges">' + data.chatbadges + '</div>'
		+ '</div>'
		+ '<div id="message" class="hl-message" style="'+data.backgroundColor +' '+ data.textColor +'">' + data.chatmessage + '</div>'
		+ '<div class="hl-img"><img src="' + data.chatimg + '" onerror="this.parentNode.style.display=\'none\'"></div>'
		+ addImage
		+ data.hasDonation + data.hasMembership + '</div>';
}

function renderPollMarkup(data){
	var output = '<div class="hl-c-cont highlight-chat">'
		+ '<div class="hl-name" id="nameDIV">' + data.question
		+ '</div>';
	for (var i=0;i<data.answers.length;i++){
		try{
			output += '<div class="hl-choice" id="message_'+i+'">• ' + data.answers[i].answer + '</div>';
		}catch(e){}
	}
	output += '</div>';
	return output;
}
