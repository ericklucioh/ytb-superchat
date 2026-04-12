(function () {
	var runtime = window.OverlayRuntime;
	var avatarHelpers = window.OverlayAvatarHelpers || {};
	var channel = runtime.generateStreamID();
	var outputCounter = 0; // used to avoid doubling up on old messages if lag or whatever
	var sendProperties = runtime.DEFAULT_SEND_PROPERTIES;
	var alreadyPrompted = false;
	var localBridge = null;
	var unwatchStreamId = null;

	function syncSession(nextSession) {
		var session = String(nextSession || "").replace(/\s+/g, "").trim();
		if (!session || session === channel) {
			return;
		}

		channel = session;
		if (localBridge) {
			localBridge.setSession(channel);
		}
	}

	function actionwtf(){ // steves personal socket server service
		if (!alreadyPrompted){
			alreadyPrompted=true;
			prompt("Overlay Link: https://chat.overlay.ninja?session="+channel+"\nAdd as a browser source; set height to 250px", "https://chat.overlay.ninja?session="+channel);
		}
		runtime.persistStreamId(channel);
		chrome.runtime.lastError;
	}

	function pushFeedMessage(data){
		outputCounter += 1;
		var bridge = ensureLocalBridge();
		if (!bridge) {
			return;
		}
		runtime.sendBridgeMessage(bridge, data, {
			envelopeKey: "feed",
			id: outputCounter,
			includeSettings: false
		});
	}

	function ensureLocalBridge() {
		if (localBridge) {
			return localBridge;
		}
		if (!window.OverlayLocalChatBridge || !window.OverlayLocalChatBridge.createChannel) {
			return null;
		}
		localBridge = window.OverlayLocalChatBridge.createChannel({
			role: "source",
			session: channel
		});
		localBridge.connect();
		return localBridge;
	}

	function isYoutubeFeedNode(element) {
		if (!element || !element.tagName) {
			return false;
		}
		return [
			"YT-LIVE-CHAT-TEXT-MESSAGE-RENDERER",
			"YT-LIVE-CHAT-PAID-MESSAGE-RENDERER",
			"YT-LIVE-CHAT-MEMBERSHIP-ITEM-RENDERER",
			"YT-LIVE-CHAT-PAID-STICKER-RENDERER",
			"YTD-SPONSORSHIPS-LIVE-CHAT-GIFT-PURCHASE-ANNOUNCEMENT-RENDERER"
		].includes(element.tagName.toUpperCase());
	}

	function extractYoutubeAvatar(element) {
		var selectors = [
			"#img",
			"img.avatar",
			".avatar img",
			"yt-img-shadow img",
			"img[src*='yt3.ggpht.com']",
			"img[src*='googleusercontent.com']"
		];

		var src = avatarHelpers.extractAvatarSrcFromDom ? avatarHelpers.extractAvatarSrcFromDom(element, selectors) : "";
		if (src) {
			src = src.replace("=s32-", "=s128-");
			src = src.replace("=s64-", "=s128-");
			src = src.replace("=s88-", "=s128-");
			return src;
		}

		return "";
	}

	function sendYoutubeFeed(element) {
		if (!isYoutubeFeedNode(element) || element.dataset.feedSent) {
			return;
		}
		if ($(element)[0].hasAttribute("is-deleted")) {
			return;
		}

		element.dataset.feedSent = "1";

		var chatname = $(element).find("#author-name").text();
		if (showOnlyFirstName) {
			chatname = chatname.replace(/ .*/, '');
		}
		if (!chatname) {
			chatname = $(element).find("#primary-text").text() || $(element).find("#header-subtext").text() || "YouTube";
		}

		var chatmessage = $(element).find("#message").html();
		var chatimg = extractYoutubeAvatar(element);
		var chatdonation = $(element).find("#purchase-amount").html();
		var chatmembership = $(element).find(".yt-live-chat-membership-item-renderer #header-subtext").html();
		var chatsticker = $(element).find(".yt-live-chat-paid-sticker-renderer #img").attr("src");
		if (chatsticker) {
			chatdonation = $(element).find("#purchase-amount-chip").html();
		}
		var giftedmemembership = $(element).find("#primary-text.ytd-sponsorships-live-chat-header-renderer").html();
		var chatbadges = "";
		if ($(element).find("#chat-badges .yt-live-chat-author-badge-renderer img").length > 0) {
			chatbadges = $(element).find("#chat-badges .yt-live-chat-author-badge-renderer img").parent().html();
		}

		var hasDonation = '';
		if (chatdonation) {
			hasDonation = '<div class="donation">' + chatdonation + '</div>';
		}

		if (chatsticker) {
			chatmessage = '<img src="' + chatsticker + '">';
		}

		var hasMembership = '';
		if (chatmembership) {
			if (chatmessage) {
				hasMembership = '<div class="donation membership">MEMBER CHAT</div>';
			} else if (giftedmemembership) {
				hasMembership = '<div class="donation membership">SPONSORSHIP</div>';
				chatmessage = giftedmemembership;
			} else {
				hasMembership = '<div class="donation membership">NEW MEMBER!</div>';
				chatmessage = chatmembership;
			}
		} else if (!chatmessage && giftedmemembership) {
			chatmessage = giftedmemembership;
			hasMembership = '<div class="donation membership">SPONSORSHIP</div>';
		}

		var backgroundColor = "";
		var textColor = "";
		if (element.style && element.style.getPropertyValue('--yt-live-chat-paid-message-primary-color')) {
			backgroundColor = "background-color: " + element.style.getPropertyValue('--yt-live-chat-paid-message-primary-color') + ";";
			textColor = "color: #111;";
		}
		if (element.style && element.style.getPropertyValue('--yt-live-chat-sponsor-color')) {
			backgroundColor = "background-color: " + element.style.getPropertyValue('--yt-live-chat-sponsor-color') + ";";
			textColor = "color: #111;";
		}

		var eventType = "message";
		if (hasDonation) {
			eventType = "superchat";
		} else if (hasMembership) {
			eventType = "member";
		}

		var data = {};
		data.chatname = chatname;
		data.chatbadges = chatbadges;
		data.backgroundColor = backgroundColor;
		data.textColor = textColor;
		data.chatmessage = chatmessage || "";
		data.chatimg = chatimg || "unknown.png";
		data.hasDonation = hasDonation;
		data.hasMembership = hasMembership;
		data.type = "youtube";
		data.platform = "youtube";
		data.eventType = eventType;
		data.feed = true;
		data.timestamp = Date.now();

		outputCounter += 1;
		data.id = "yt-feed-" + outputCounter;
		pushFeedMessage(data);
	}

	var showOnlyFirstName;

	var highlightWords = [];

	//browser.runtime.connect().onDisconnect.addListener(function() {
	//})

	$("body").on("click", ".btn-clear-youtube", function () {
	  $(".hl-c-cont").addClass("fadeout").delay(300).queue(function(){
		$(".hl-c-cont").remove().dequeue();
	  });
	});

	$("body").on("click", ".btn-getoverlay-youtube", function () {
		alreadyPrompted=true;
		prompt("Overlay Link: https://chat.overlay.ninja?session="+channel+"\nAdd as a browser source; set height to 250px", "https://chat.overlay.ninja?session="+channel);
	});

	// Restore settings

	var properties = ["color","scale","streamID","sizeOffset","commentBottom","commentHeight","authorBackgroundColor","authorAvatarBorderColor","authorColor","commentBackgroundColor","commentColor","fontFamily","showOnlyFirstName","highlightWords"];

	runtime.loadSettings(properties, function(item){
	  if (item.streamID){
		channel = item.streamID;
	  } else {
		runtime.persistStreamId(channel);
		chrome.runtime.lastError;
	  }

	  ensureLocalBridge();
	  if (!unwatchStreamId && runtime.watchStreamId) {
		unwatchStreamId = runtime.watchStreamId(syncSession);
	  }
	  runtime.applyOverlaySettings(item, document.documentElement, { color: "#000" });
	  showOnlyFirstName = !!item.showOnlyFirstName;
	  highlightWords = runtime.normalizeHighlightWords(item.highlightWords);
	});

	$("#primary-content").append('<span style="font-size: 0.7em">Aspect Ratio: <span id="aspect-ratio"></span></span>');


	setTimeout(function(){
		$( "yt-live-chat-app" ).before( '<button class="btn-clear-youtube">CLEAR</button><button class="btn-getoverlay-youtube">LINK</button>' );
		actionwtf();
	},600);

		function onElementInserted(containerSelector,  callback) {

		var onMutationsObserved = function(mutations) {
			mutations.forEach(function(mutation) {
				if (mutation.addedNodes.length) {
					for (var i = 0, len = mutation.addedNodes.length; i < len; i++) {
						if (mutation.addedNodes[i].tagName == "yt-live-chat-text-message-renderer".toUpperCase()) {
							callback(mutation.addedNodes[i]);
						} else if (mutation.addedNodes[i].tagName == "yt-live-chat-paid-message-renderer".toUpperCase()) {
							callback(mutation.addedNodes[i]);
						} else if (mutation.addedNodes[i].tagName == "yt-live-chat-membership-item-renderer".toUpperCase()) {
							callback(mutation.addedNodes[i]);
						} else if (mutation.addedNodes[i].tagName == "yt-live-chat-paid-sticker-renderer".toUpperCase()) {
							callback(mutation.addedNodes[i]);
						} else if (mutation.addedNodes[i].tagName == "ytd-sponsorships-live-chat-gift-purchase-announcement-renderer".toUpperCase()) {
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

	onElementInserted("yt-live-chat-app", function(element){ // Check for highlight words
	  sendYoutubeFeed(element);
	  var chatWords = element.innerText.split(" ");
	  if (!highlightWords){
		  highlightWords=[];
	  }
	  var highlights = chatWords.filter(value => highlightWords.includes(value.toLowerCase().replace(/[^a-z0-9]/gi, '')));
	  element.classList.remove("shown-comment");
	  if(highlights.length > 0) {
		 element.classList.add("highlighted-comment");
	  }
	});

})();
