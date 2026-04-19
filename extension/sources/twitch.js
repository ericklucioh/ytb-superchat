var runtime = window.OverlayRuntime;
var avatarHelpers = window.OverlayAvatarHelpers || {};
var channel = runtime.generateStreamID();
var outputCounter = 0; // used to avoid doubling up on old messages if lag or whatever
var sendProperties = runtime.DEFAULT_SEND_PROPERTIES;
var localBridge = null;
function twitchLog() {}
var unwatchStreamId = null;
var twitchSweepTimer = null;

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

function actionwtf(){ // legacy overlay connection
	runtime.persistStreamId(channel);
	runtime.ignoreRuntimeError && runtime.ignoreRuntimeError();
}

function pushFeedMessage(data){
	outputCounter += 1;
	twitchLog("pushFeedMessage()", {
		id: outputCounter,
		chatname: data && data.chatname,
		eventType: data && data.eventType,
		hasDonation: !!(data && data.hasDonation),
		hasMembership: !!(data && data.hasMembership),
		messagePreview: data && data.chatmessage ? String(data.chatmessage).slice(0, 80) : ""
	});
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

function extractTwitchAvatarFromDom(element) {
	var selectors = [
		"img[alt*='avatar']",
		"img[alt*='Avatar']",
		"img[class*='avatar']",
		"img[class*='profile']",
		"picture img",
		"img[src*='static-cdn.jtvnw.net']",
		"img[src*='ttvnw.net']"
	];

	return avatarHelpers.extractAvatarSrcFromDom ? avatarHelpers.extractAvatarSrcFromDom(element, selectors) : "";
}

function startTwitchConnections() {
	setTimeout(function () {
		actionwtf();
	}, 500);
}

function isTwitchFeedNode(element) {
	if (!element || !element.className) {
		return !!(element && element.querySelector && (
			element.querySelector("[data-a-target='chat-line-message-body']") ||
			element.querySelector("[data-test-selector='chat-line-message-body']") ||
			element.querySelector("span.message")
		));
	}
	var className = String(element.className);
	return className.indexOf("chat-line__message") !== -1
		|| className.indexOf("chat-line__message--") !== -1
		|| className.indexOf("chat-message") !== -1
		|| !!(element.querySelector && (
			element.querySelector("[data-a-target='chat-line-message-body']") ||
			element.querySelector("[data-test-selector='chat-line-message-body']") ||
			element.querySelector("span.message")
		));
}

function sendTwitchFeed(element, signature) {
	if (!isTwitchFeedNode(element)) {
		twitchLog("skip element", {
			reason: "not_twitch_node",
			className: element && element.className
		});
		return;
	}

	var nextSignature = signature || buildTwitchMessageSignature(element);
	if (nextSignature && element.dataset.feedSignature === nextSignature) {
		twitchLog("skip element", {
			reason: "already_sent",
			className: element && element.className
		});
		return true;
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

	var chatmessage = $(element).find('*[data-a-target="chat-line-message-body"]').html();
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
	var avatarFromDom = extractTwitchAvatarFromDom(element);
	if (avatarFromDom) {
		chatimg = avatarFromDom;
	}
	chatimg = chatimg || (runtime.getRuntimeUrl ? runtime.getRuntimeUrl("twitch.png") : "twitch.png");

	var donationNode = $(element).find("[class*='donation'], [class*='tip'], [data-tip], [data-gifted], [class*='train']");
	if (donationNode.length && !chatdonation) {
		chatdonation = donationNode.text().trim();
	}

	var membershipNode = $(element).find("[class*='subscrib'], [data-subscriber], [data-gifted]");
	if (membershipNode.length || /subscribed|subscription|renewed|gift/i.test((element.innerText || "").toLowerCase()) || /sub/i.test((element.innerText || "").toLowerCase())) {
		chatmembership = membershipNode.text().trim() || "SUB";
	}

	var subscriptionMonths = extractTwitchSubscriptionMonths(element.innerText || "", chatmembership, chatmessage);

	if ($(element).find('.chat-line__message--cheer-amount').length) {
		chatdonation = chatdonation || $(element).find('.chat-line__message--cheer-amount').html();
	}

	element.style.backgroundColor = "#666";
	$(element).addClass("shown-comment");

	var hasDonation = '';
	if (chatdonation) {
		hasDonation = '<div class="cheer">' + chatdonation + '</div>';
	}
	var isBitsDonation = !!$(element).find('.chat-line__message--cheer-amount').length || /\bbits?\b/i.test(String(chatdonation));

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
	data.months = subscriptionMonths;
	data.currency = isBitsDonation ? "BITS" : "";
	data.type = "twitch";
	data.platform = "twitch";
	data.eventType = eventType;
	data.feed = true;
	data.timestamp = Date.now();

	if (nextSignature) {
		element.dataset.feedSignature = nextSignature;
	}
	element.dataset.feedSent = "1";
	twitchLog("captured element", {
		chatname: chatname,
		hasDonation: !!chatdonation,
		hasMembership: !!chatmembership,
		messagePreview: String(chatmessage).slice(0, 80)
	});

	if (avatarFromDom) {
		pushFeedMessage(data);
		return true;
	}

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

	return true;
}

function buildTwitchMessageSignature(element) {
	if (!element) {
		return "";
	}

	var chatname = $(element).find(".chat-author__display-name").text() || $(element).find("[data-a-target='chat-message-username']").text() || "";
	var chatmessage = $(element).find('*[data-a-target="chat-line-message-body"]').text() || $(element).find('span.message').text() || element.innerText || "";
	var badgeText = $(element).find(".chat-line__message-badges, .chat-author__badges, .chat-badge").text() || "";
	var className = String(element.className || "");
	return [chatname.trim(), chatmessage.trim(), badgeText.trim(), className].join("|");
}

function extractTwitchSubscriptionMonths(text, membershipText, messageText) {
	var haystack = [text, membershipText, messageText].filter(Boolean).join(" ").toLowerCase();
	if (!haystack) {
		return NaN;
	}

	var patterns = [
		/\bsubscribed\s+for\s+(\d{1,4})\s+months?\b/i,
		/\b(\d{1,4})\s+months?\b/i,
		/\bmonth(?:s)?\s*:\s*(\d{1,4})\b/i
	];

	for (var i = 0; i < patterns.length; i += 1) {
		var match = haystack.match(patterns[i]);
		if (match && match[1]) {
			var value = Number(match[1]);
			if (Number.isFinite(value) && value > 0) {
				return value;
			}
		}
	}

	return NaN;
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
		document.querySelector(".chat-input__buttons-container").innerHTML += '<button  id="pushButtonOverlay" class="btn-clear-twitch">CLEAR</button>';
	} else if (document.querySelector(".chat-room__content")){
		document.querySelector(".chat-room__content").lastChild.innerHTML += '<button  id="pushButtonOverlay" class="btn-clear-twitch">CLEAR</button>';
	} 
}

setTimeout(function(){addButtons();},1000);

setTimeout(function(){addButtons();},10000);

var properties = ["color","scale","streamID","sizeOffset","commentBottom","commentHeight","authorBackgroundColor","authorAvatarBorderColor","authorColor","commentBackgroundColor","commentColor","fontFamily","showOnlyFirstName","highlightWords"];

runtime.loadSettings(properties, function(item){
  twitchLog("settings loaded", {
    hasStreamId: !!item.streamID,
    showOnlyFirstName: !!item.showOnlyFirstName,
    highlightWordsCount: Array.isArray(item.highlightWords) ? item.highlightWords.length : (typeof item.highlightWords === "string" ? item.highlightWords.split(",").length : 0)
  });
	if (item.streamID){
    channel = item.streamID;
  } else {
	runtime.persistStreamId(channel);
	runtime.ignoreRuntimeError && runtime.ignoreRuntimeError();
  }

  ensureLocalBridge();
  if (!unwatchStreamId && runtime.watchStreamId) {
    unwatchStreamId = runtime.watchStreamId(syncSession);
  }
  runtime.applyOverlaySettings(item, document.documentElement, { color: "#000" });
  showOnlyFirstName = !!item.showOnlyFirstName;
  highlightWords = runtime.normalizeHighlightWords(item.highlightWords);
  startTwitchSweep();
  startTwitchConnections();
});


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
		twitchLog("mutation observed", {
			containerSelector: containerSelector,
			mutationCount: mutations.length
		});
		mutations.forEach(function(mutation) {
			if (mutation.addedNodes.length) {
				for (var i = 0, len = mutation.addedNodes.length; i < len; i++) {
					var addedNode = mutation.addedNodes[i];
					if (!addedNode || addedNode.nodeType !== 1) {
						continue;
					}
					twitchLog("added node", {
						className: addedNode.className,
						tagName: addedNode.tagName
					});
					if (typeof callback === "function") {
						callback(addedNode);
					}
				}
			}
		});
	};
	var target = document.querySelectorAll(containerSelector)[0];
	if (!target) {
		return;
	}
	var config = { childList: true, subtree: true };
	var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
	var observer = new MutationObserver(onMutationsObserved);
	observer.observe(target, config);

}

function collectTwitchMessageNodes(node) {
	if (!node) {
		return [];
	}

	var selectors = [
		"div.chat-line__message",
		"[data-a-target='chat-line-message']",
		"[data-test-selector='chat-line-message']"
		,
		"[data-a-target='chat-line-message-body']",
		"[data-test-selector='chat-line-message-body']",
		"[data-a-target='chat-message-text']",
		"div[data-a-target='chat-message']"
	];
	var results = [];

	if (node.tagName) {
		var tagName = String(node.tagName).toLowerCase();
		if (tagName === "chat-line__message" || (tagName === "div" && String(node.className || "").indexOf("chat-line__message") !== -1)) {
			results.push(node);
		}
	}

	if (node.querySelectorAll) {
		for (var i = 0; i < selectors.length; i += 1) {
			var selector = selectors[i];
			var found = node.querySelectorAll(selector);
			for (var j = 0; j < found.length; j += 1) {
				results.push(found[j]);
			}
		}
	}

	return results.filter(function (entry, index, array) {
		return array.indexOf(entry) === index;
	});
}

function processTwitchCandidate(candidate) {
	if (!candidate) {
		return false;
	}

	twitchLog("processing candidate", {
		tagName: candidate.tagName,
		className: candidate.className,
		textPreview: candidate.innerText ? String(candidate.innerText).slice(0, 80) : ""
	});
	var signature = buildTwitchMessageSignature(candidate);
	if (signature && candidate.dataset.feedSignature === signature) {
		return false;
	}
	var sent = sendTwitchFeed(candidate, signature) === true;

	// Check for highlight words
	var chattext = $(candidate).find("#message").text() || candidate.innerText || "";
	var chatWords = chattext.split(" ");
	if (!highlightWords){
		highlightWords=[];
	}
	var highlights = chatWords.filter(value => highlightWords.includes(value.toLowerCase().replace(/[^a-z0-9]/gi, '')));
	$(candidate).removeClass("shown-comment");
	if(highlights.length > 0) {
		$(candidate).addClass("highlighted-comment");
	}
	return sent;
}

function sweepTwitchMessages() {
	var candidates = collectTwitchMessageNodes(document);
	if (!candidates.length) {
		return false;
	}

	var processed = false;
	for (var i = 0; i < candidates.length; i += 1) {
		processed = processTwitchCandidate(candidates[i]) || processed;
	}
	return processed;
}

function startTwitchSweep() {
	if (twitchSweepTimer) {
		return;
	}

	twitchSweepTimer = setInterval(function () {
		sweepTwitchMessages();
	}, 2500);
}

function scanTwitchNode(node, reason) {
	var candidates = collectTwitchMessageNodes(node);
	twitchLog("candidate message callback", {
		className: node && node.className,
		textPreview: node && node.innerText ? String(node.innerText).slice(0, 80) : "",
		candidateCount: candidates.length,
		reason: reason || "mutation"
	});

	if (!candidates.length) {
		return false;
	}

	var processed = false;
	for (var c = 0; c < candidates.length; c += 1) {
		processed = processTwitchCandidate(candidates[c]) || processed;
	}
	return processed;
}

function queueTwitchRescan(node) {
	if (!node || node.dataset.twitchRescanQueued) {
		return;
	}

	node.dataset.twitchRescanQueued = "1";
	setTimeout(function () {
		delete node.dataset.twitchRescanQueued;
		var processed = scanTwitchNode(node, "delayed");
		if (!processed) {
			twitchLog("delayed rescan still empty", {
				className: node.className,
				preview: String(node.innerText || "").slice(0, 80)
			});
		}
	}, 250);
}

function startTwitchObserver() {
	var containerSelectors = [
		".chat-scrollable-area__message-container",
		"[data-test-selector='chat-scrollable-area__message-container']",
		"[data-a-target='chat-scroller']",
		"[data-a-target='chat-list']",
		".chat-scrollable-area"
	];

	var started = false;
	for (var i = 0; i < containerSelectors.length; i += 1) {
		var selector = containerSelectors[i];
		var target = document.querySelector(selector);
		if (target) {
			onElementInsertedTwitch(selector, "chat-line__message", function(element){
				var processed = scanTwitchNode(element, "mutation");
				if (!processed) {
					var hasContent = String(element.textContent || "").trim().length > 0;
					if (String(element.className || "").indexOf("Layout-sc-") === 0 && hasContent) {
						twitchLog("wrapper without message nodes", {
							className: element.className,
							preview: String(element.innerText || "").slice(0, 80)
						});
					}
					if (hasContent) {
						queueTwitchRescan(element);
					}
					return;
				}
			});
			started = true;
			break;
		}
	}

	if (started) {
		return;
	}
	setTimeout(startTwitchObserver, 500);
}

startTwitchObserver();
	
