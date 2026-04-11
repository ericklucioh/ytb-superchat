var soca=false;
function generateStreamID(){
	var text = "";
	var possible = "ABCEFGHJKLMNPQRSTUVWXYZabcefghijkmnpqrstuvwxyz23456789";
	for (var i = 0; i < 11; i++){
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
};
var channel = generateStreamID();
var feedChannel = channel + ":feed";
var outputCounter = 0; // used to avoid doubling up on old messages if lag or whatever
var socaFeed = false;

var sendProperties = ["color","scale","sizeOffset","commentBottom","commentHeight","authorBackgroundColor","authorAvatarBorderColor","authorColor","commentBackgroundColor","commentColor","fontFamily","showOnlyFirstName","highlightWords"];
var alreadyPrompted = false;

function actionwtf(){ // steves personal socket server service
	if (soca){return;}

	soca = new WebSocket("wss://api.overlay.ninja");
	soca.onclose = function (){
		setTimeout(function(){soca=false;actionwtf(); },2000);
	};
	soca.onopen = function (){
		soca.send(JSON.stringify({"join":channel}));
	};
	
	soca.addEventListener('message', function (event) {
		if (event.data){
			var data = JSON.parse(event.data);
			if ("url" in data){
				if ("twitch" in data){
					if (document.getElementById("img_"+data["twitch"])){
						document.getElementById("img_"+data["twitch"]).src = data['url'];
					}
				}
			}
		}
	});

	chrome.storage.sync.set({
		streamID: channel
	});
	
	chrome.runtime.lastError;
}

function feedwtf(){
	if (socaFeed){return;}
	socaFeed = new WebSocket("wss://api.overlay.ninja");
	socaFeed.onclose = function (){
		setTimeout(function(){socaFeed=false;feedwtf(); },2000);
	};
	socaFeed.onopen = function (){
		socaFeed.send(JSON.stringify({"join":feedChannel}));
	};
}

function pushFeedMessage(data){
	var message = {};
	message.feed = true;
	message.contents = data;
	try {
		chrome.storage.sync.get(sendProperties, function(item){
			outputCounter += 1;
			message.id = outputCounter;
			message.settings = item;
			socaFeed.send(JSON.stringify(message));
		});
	} catch(e){
		outputCounter += 1;
		message.id = outputCounter;
		socaFeed.send(JSON.stringify(message));
	}
}

function isTwitchFeedNode(element) {
	if (!element || !element.className) {
		return false;
	}
	var className = String(element.className);
	return className.indexOf("chat-line__message") !== -1 || className.indexOf("chat-line__message--") !== -1;
}

function sendTwitchFeed(element) {
	if (!isTwitchFeedNode(element) || element.dataset.feedSent) {
		return;
	}

	var chatdonation = false;
	var chatmembership = false;
	var chatsticker = false;
	var chatname = $(element).find(".chat-author__display-name").text();

	if (showOnlyFirstName) {
		chatname = chatname.replace(/ .*/, '');
	}
	if (!chatname) {
		chatname = $(element).find("[data-a-target='chat-message-username']").text() || "Twitch";
	}

	$(element).find('.bttv-tooltip').html("");

	var chatmessage = $(element).find('*[data-a-target="chat-line-message-body"').html();
	if (!chatmessage) {
		chatmessage = $(element).find('span.message').html();
	}
	if (!chatmessage) {
		chatdonation = $(element).find('.chat-line__message--cheer-amount').html();
		if (chatdonation) {
			chatmessage = "";
			chatdonation = 0;
			$(element).find(".chat-line__message-container").find('span[data-a-target="chat-message-separator"]').nextAll().each(function(index){
				if ($(this).find('.chat-line__message--cheer-amount').html()) {
					chatdonation += parseInt($(this).find('.chat-line__message--cheer-amount').html());
				}
				chatmessage += $(this).html();
			});
			if (chatdonation == 1) {
				chatdonation += " bit";
			} else if (chatdonation > 1) {
				chatdonation += " bits";
			}
		}
	}
	if (!chatmessage) {
		return;
	}

	var chatimg = "";
	if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) {
		chatimg = chrome.runtime.getURL("twitch.png");
	} else {
		chatimg = "twitch.png";
	}

	var donationNode = $(element).find("[class*='donation'], [class*='tip'], [data-tip], [data-gifted], [class*='train']");
	if (donationNode.length && !chatdonation) {
		chatdonation = donationNode.text().trim();
	}

	var membershipNode = $(element).find("[class*='subscrib'], [data-subscriber], [data-gifted]");
	if (membershipNode.length || /subscribed|subscription|renewed|gift/i.test((element.innerText || "").toLowerCase()) || /sub/i.test((element.innerText || "").toLowerCase())) {
		chatmembership = membershipNode.text().trim() || "SUB";
	}

	if ($(element).find('.chat-line__message--cheer-amount').length) {
		chatdonation = chatdonation || $(element).find('.chat-line__message--cheer-amount').html();
	}

	element.style.backgroundColor = "#666";
	$(element).addClass("shown-comment");

	var hasDonation = '';
	if (chatdonation) {
		hasDonation = '<div class="cheer">' + chatdonation + '</div>';
	}

	var hasMembership = '';
	var eventType = "message";
	if (chatmembership) {
		hasMembership = '<div class="donation membership">NEW MEMBER!</div>';
		eventType = "sub";
	}
	if (chatdonation) {
		eventType = "superchat";
	}
	if (chatsticker) {
		chatmessage = '<img src="' + chatsticker + '">';
		eventType = "superchat";
	}

	var backgroundColor = "";
	var textColor = "";
	if (element.style.getPropertyValue('--yt-live-chat-paid-message-primary-color')) {
		backgroundColor = "background-color: " + element.style.getPropertyValue('--yt-live-chat-paid-message-primary-color') + ";";
		textColor = "color: #111;";
	}
	if (element.style.getPropertyValue('--yt-live-chat-sponsor-color')) {
		backgroundColor = "background-color: " + element.style.getPropertyValue('--yt-live-chat-sponsor-color') + ";";
		textColor = "color: #111;";
	}

	var data = {};
	data.chatname = chatname;
	data.chatbadges = "";
	data.backgroundColor = backgroundColor;
	data.textColor = textColor;
	data.chatmessage = chatmessage;
	data.chatimg = chatimg;
	data.hasDonation = hasDonation;
	data.hasMembership = hasMembership;
	data.type = "twitch";
	data.platform = "twitch";
	data.eventType = eventType;
	data.feed = true;
	data.timestamp = Date.now();

	element.dataset.feedSent = "1";

	fetchWithTimeout("https://api.socialstream.ninja/twitch/avatar?username="+encodeURIComponent(data.chatname)).then(response => {
		response.text().then(function (text) {
			if (text.startsWith("https://")) {
				data.chatimg = text;
			}
			pushFeedMessage(data);
		}).catch(function(){
			pushFeedMessage(data);
		});
	}).catch(error => {
		pushFeedMessage(data);
	});
}

var showOnlyFirstName;

var highlightWords = [];


async function fetchWithTimeout(URL, timeout=8000){ // ref: https://dmitripavlutin.com/timeout-fetch-request/
	try {
		const controller = new AbortController();
		const timeout_id = setTimeout(() => controller.abort(), timeout);
		const response = await fetch(URL, {...{timeout:timeout}, signal: controller.signal});
		clearTimeout(timeout_id);
		return response;
	} catch(e){
		errorlog(e);
		return await fetch(URL); // iOS 11.x/12.0
	}
}

$("body").on("click", ".btn-clear-twitch", function () {
  $(".hl-c-cont").addClass("fadeout").delay(300).queue(function(){
    $(".hl-c-cont").remove().dequeue();
  });
});

function addButtons(){
	if (document.getElementById("pushButtonOverlay")){return;}
	if (document.querySelector(".chat-input__buttons-container")){
		document.querySelector(".chat-input__buttons-container").innerHTML += '<button  id="pushButtonOverlay" class="btn-clear-twitch">CLEAR</button><button class="btn-getoverlay-twitch">LINK</button>';
	} else if (document.querySelector(".chat-room__content")){
		document.querySelector(".chat-room__content").lastChild.innerHTML += '<button  id="pushButtonOverlay" class="btn-clear-twitch">CLEAR</button><button class="btn-getoverlay-twitch">LINK</button>';
	} 
}

setTimeout(function(){addButtons();},1000);

setTimeout(function(){addButtons();},10000);

var properties = ["color","scale","streamID","sizeOffset","commentBottom","commentHeight","authorBackgroundColor","authorAvatarBorderColor","authorColor","commentBackgroundColor","commentColor","fontFamily","showOnlyFirstName","highlightWords"];

chrome.storage.sync.get(properties, function(item){
  var color = "#000";
  if(item.color) {
    color = item.color;
  }
  if (item.streamID){
    channel = item.streamID;
    feedChannel = channel + ":feed";
  } else {
	chrome.storage.sync.set({
		streamID: channel
	});
	
	chrome.runtime.lastError;
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
  if(item.scale) {
    root.style.setProperty("--comment-scale", item.scale);
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
});


$("body").on("click", ".btn-getoverlay-twitch", function () {
    alreadyPrompted=true;
    prompt("Overlay Link: https://chat.overlay.ninja?session="+channel+"\nAdd as a browser source; set height to 250px", "https://chat.overlay.ninja?session="+channel);
});


setTimeout(function(){actionwtf();},500);
setTimeout(function(){feedwtf();},500);

$("#primary-content").append('<span style="font-size: 0.7em">Aspect Ratio: <span id="aspect-ratio"></span></span>');

function displayAspectRatio() {
  var ratio = Math.round(window.innerWidth / window.innerHeight * 100) / 100;
  ratio += " (target 1.77)";
  $("#aspect-ratio").text(ratio);
}
displayAspectRatio();
window.onresize = displayAspectRatio;


function onElementInsertedTwitch(containerSelector, className, callback) {
	var onMutationsObserved = function(mutations) {
		mutations.forEach(function(mutation) {
			if (mutation.addedNodes.length) {
				for (var i = 0, len = mutation.addedNodes.length; i < len; i++) {
					if(mutation.addedNodes[i].className == className) {
						callback(mutation.addedNodes[i]);
					}
				}
			}
		});
	};
	var target = document.querySelectorAll(containerSelector)[0];
	var config = { childList: true, subtree: true };
	var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
	var observer = new MutationObserver(onMutationsObserved);
	observer.observe(target, config);

}

onElementInsertedTwitch(".chat-scrollable-area__message-container", "chat-line__message", function(element){
  sendTwitchFeed(element);
  // Check for highlight words
  
  var chattext = $(element).find("#message").text();
  var chatWords = chattext.split(" ");
  if (!highlightWords){
	  highlightWords=[];
  }
  var highlights = chatWords.filter(value => highlightWords.includes(value.toLowerCase().replace(/[^a-z0-9]/gi, '')));
  $(element).removeClass("shown-comment");
  if(highlights.length > 0) {
	$(element).addClass("highlighted-comment");
  }
});
	
