(function () {
	var runtime = window.OverlayRuntime;
var avatarHelpers = window.OverlayAvatarHelpers || {};
var channel = runtime.generateStreamID();
var outputCounter = 0; // used to avoid doubling up on old messages if lag or whatever
var sendProperties = runtime.DEFAULT_SEND_PROPERTIES;
var localBridge = null;
var youtubeLog = runtime.createLogger ? runtime.createLogger("youtube") : null;
var unwatchStreamId = null;
var tickerObserver = null;

	function syncSession(nextSession) {
		var session = String(nextSession || "").replace(/\s+/g, "").trim();
		if (!session || session === channel) {
			return;
		}

		channel = session;
		if (localBridge) {
			localBridge.setSession(channel);
		}
		youtubeLog?.debug("session", {
			session: channel
		});
	}

	function actionwtf(){ // legacy overlay connection
		runtime.persistStreamId(channel);
		runtime.ignoreRuntimeError && runtime.ignoreRuntimeError();
	}

	function pushFeedMessage(data){
		outputCounter += 1;
		var bridge = ensureLocalBridge();
		if (!bridge) {
			return false;
		}
		runtime.sendBridgeMessage(bridge, data, {
			envelopeKey: "feed",
			id: outputCounter,
			includeSettings: false
		});
		return true;
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
			"YT-LIVE-CHAT-TICKER-PAID-MESSAGE-ITEM-RENDERER",
			"YT-LIVE-CHAT-MEMBERSHIP-ITEM-RENDERER",
			"YT-LIVE-CHAT-PAID-STICKER-RENDERER",
			"YTD-SPONSORSHIPS-LIVE-CHAT-GIFT-PURCHASE-ANNOUNCEMENT-RENDERER"
		].includes(element.tagName.toUpperCase());
	}

	function isYoutubeTickerSuperchatNode(element) {
		return !!element && !!element.tagName && element.tagName.toUpperCase() === "YT-LIVE-CHAT-TICKER-PAID-MESSAGE-ITEM-RENDERER";
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

	function extractYoutubeChatName(element) {
		var chatname = $(element).find("#author-name").text().trim();
		if (!chatname) {
			chatname = String($(element).attr("aria-label") || "").trim();
		}
		if (!chatname) {
			chatname = $(element).find("#primary-text").text().trim() || $(element).find("#header-subtext").text().trim();
		}
		if (!chatname && isYoutubeTickerSuperchatNode(element)) {
			chatname = $(element).find("#text span").first().text().trim();
		}
		return chatname || "YouTube";
	}

	function extractYoutubeDonationText(element) {
		var selectors = [
			"#purchase-amount",
			"#purchase-amount-chip",
			"[id*='purchase-amount']",
			"yt-formatted-string#purchase-amount",
			"yt-formatted-string#purchase-amount-chip"
		];

		for (var i = 0; i < selectors.length; i += 1) {
			var node = $(element).find(selectors[i]).first();
			var donationText = node.html() || node.text() || "";
			if (donationText.trim()) {
				return donationText.trim();
			}
		}

		return "";
	}

	function extractYoutubeMembershipText(element) {
		var selectors = [
			"#header-primary-text",
			".yt-live-chat-author-badge-renderer[aria-label]",
			".yt-live-chat-author-badge-renderer[shared-tooltip-text]",
			"yt-live-chat-author-badge-renderer[aria-label]"
		];

		for (var i = 0; i < selectors.length; i += 1) {
			var node = $(element).find(selectors[i]).first();
			var membershipText = node.text() || node.attr("aria-label") || node.attr("shared-tooltip-text") || node.html() || "";
			if (membershipText.trim()) {
				return membershipText.trim();
			}
		}

		return "";
	}

	function extractYoutubeMembershipMonths(element) {
		var membershipText = [
			extractYoutubeMembershipText(element),
			$(element).find(".yt-live-chat-membership-item-renderer #header-subtext").text().trim()
		].filter(Boolean).join(" ");
		var match = membershipText.match(/\b(\d{1,4})\s+(?:months?|mes(?:es)?|m[êe]s(?:es)?)\b/i);
		if (match && match[1]) {
			var value = Number(match[1]);
			return Number.isFinite(value) && value > 0 ? value : NaN;
		}

		return NaN;
	}

	function hasYoutubeTickerSuperchatData(element, chatdonation) {
		if (!isYoutubeTickerSuperchatNode(element)) {
			return true;
		}

		return !!String(chatdonation || "").trim();
	}

	function sendYoutubeFeed(element) {
		if (!isYoutubeFeedNode(element) || element.dataset.feedSent) {
			return;
		}
		if ($(element)[0].hasAttribute("is-deleted")) {
			return;
		}

		var chatname = extractYoutubeChatName(element);
		if (showOnlyFirstName) {
			chatname = chatname.replace(/ .*/, '');
		}

			var chatmessage = $(element).find("#message").text().trim() || $(element).find("#message").html() || "";
			var chatimg = extractYoutubeAvatar(element);
			var chatdonation = extractYoutubeDonationText(element);
			var chatmembership = extractYoutubeMembershipText(element);
			var chatmembershipMonths = extractYoutubeMembershipMonths(element);
			var chatsticker = $(element).find(".yt-live-chat-paid-sticker-renderer #img").attr("src");
			if (chatsticker) {
				chatdonation = extractYoutubeDonationText(element);
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

			if (!hasYoutubeTickerSuperchatData(element, chatdonation)) {
				return;
			}

			element.dataset.feedSent = "1";

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
		if (Number.isFinite(chatmembershipMonths)) {
			data.months = chatmembershipMonths;
		}
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

	// Restore settings

	var properties = ["color","scale","streamID","sizeOffset","commentBottom","commentHeight","authorBackgroundColor","authorAvatarBorderColor","authorColor","commentBackgroundColor","commentColor","fontFamily","showOnlyFirstName","highlightWords"];

	runtime.loadSettings(properties, function(item){
	  if (item.streamID){
		channel = item.streamID;
	  } else {
		runtime.persistStreamId(channel);
		runtime.ignoreRuntimeError && runtime.ignoreRuntimeError();
	  }

	  youtubeLog?.debug("boot", {
		session: channel,
		hasSession: !!item.streamID
	  });

	  ensureLocalBridge();
	  if (!unwatchStreamId && runtime.watchStreamId) {
		unwatchStreamId = runtime.watchStreamId(syncSession);
	  }
	  runtime.applyOverlaySettings(item, document.documentElement, { color: "#000" });
	  showOnlyFirstName = !!item.showOnlyFirstName;
	  highlightWords = runtime.normalizeHighlightWords(item.highlightWords);
	});

	$("#primary-content").append('<span style="font-size: 0.7em">Aspect Ratio: <span id="aspect-ratio"></span></span>');

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
		if (!target) {
			setTimeout(function () {
				onElementInserted(containerSelector, callback);
			}, 500);
			return;
		}
		var config = { childList: true, subtree: true };
		var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
		if (!MutationObserver) {
			setTimeout(function () {
				onElementInserted(containerSelector, callback);
			}, 500);
			return;
		}
		var observer = new MutationObserver(onMutationsObserved);
		observer.observe(target, config);

	}

	function watchYoutubeTickerRenderer(callback) {
		if (tickerObserver) {
			return;
		}

		var target = document.querySelector("yt-live-chat-ticker-renderer");
		if (!target) {
			setTimeout(function () {
				watchYoutubeTickerRenderer(callback);
			}, 500);
			return;
		}

		var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
		if (!MutationObserver) {
			setTimeout(function () {
				watchYoutubeTickerRenderer(callback);
			}, 500);
			return;
		}

		tickerObserver = new MutationObserver(function (mutations) {
			mutations.forEach(function () {
				var items = target.querySelectorAll("yt-live-chat-ticker-paid-message-item-renderer");
				for (var i = 0; i < items.length; i += 1) {
					callback(items[i]);
				}
			});
		});
		tickerObserver.observe(target, {
			childList: true,
			characterData: true,
			subtree: true
		});
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

	watchYoutubeTickerRenderer(function (element) {
		sendYoutubeFeed(element);
	});

})();
