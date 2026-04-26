var runtime = window.OverlayRuntime;
var avatarHelpers = window.OverlayAvatarHelpers || {};
var channel = runtime.generateStreamID();
var outputCounter = 0; // used to avoid doubling up on old messages if lag or whatever
var sendProperties = runtime.DEFAULT_SEND_PROPERTIES;
var localBridge = null;
var twitchLogger = runtime.createLogger ? runtime.createLogger("twitch") : null;
function twitchLog(message, extra) {
	if (twitchLogger) {
		twitchLogger.debug(message, extra || {});
	}
}
var unwatchStreamId = null;
var twitchSweepTimer = null;
var twitchSweepInterval = 0;
var twitchVisibilityListenerBound = false;

function syncSession(nextSession) {
	var session = String(nextSession || "").replace(/\s+/g, "").trim();
	if (!session || session === channel) {
		return;
	}

	channel = session;
	if (localBridge) {
		localBridge.setSession(channel);
	}
	twitchLog("session", {
		session: channel
	});
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

function getTwitchMessageRootSelector() {
	return "div.chat-line__message,[data-a-target='chat-line-message'],[data-test-selector='chat-line-message']";
}

function isTwitchMessageRoot(element) {
	if (!element || element.nodeType !== 1 || !element.matches) {
		return false;
	}
	return element.matches(getTwitchMessageRootSelector());
}

function resolveTwitchMessageRoot(element) {
	if (!element || element.nodeType !== 1) {
		return null;
	}

	if (isTwitchMessageRoot(element)) {
		return element;
	}

	if (element.closest) {
		var closest = element.closest(getTwitchMessageRootSelector());
		if (closest) {
			return closest;
		}
	}

	var selectors = [
		"[data-a-target='chat-message-username']",
		"[data-a-target='chat-line-message-body']",
		"[data-a-target='chat-message-text']",
		"[data-a-target='chat-message-cheer-amount']",
		"[data-test-selector='chat-line-message-body']",
		"[data-test-selector='message-username']"
	];
	for (var i = 0; i < selectors.length; i += 1) {
		var nodes = element.querySelectorAll ? element.querySelectorAll(selectors[i]) : [];
		for (var j = 0; j < nodes.length; j += 1) {
			var root = nodes[j] && nodes[j].closest ? nodes[j].closest(getTwitchMessageRootSelector()) : null;
			if (root) {
				return root;
			}
		}
	}

	return null;
}

function extractTwitchMessageText(root) {
	if (!root) {
		return "";
	}

	var body = root.querySelector("[data-a-target='chat-message-text'], [data-a-target='chat-line-message-body'], [data-test-selector='chat-line-message-body'], span.message");
	if (body) {
		return body.innerHTML || body.textContent || "";
	}

	return root.innerHTML || root.textContent || "";
}

function extractTwitchAuthorName(root) {
	if (!root) {
		return "";
	}

	var authorNode = root.querySelector("[data-a-target='chat-message-username'], [data-test-selector='message-username'], .chat-author__display-name");
	var chatname = authorNode ? (authorNode.textContent || "").trim() : "";
	if (!chatname && root.getAttribute) {
		chatname = String(root.getAttribute("data-a-user") || "").trim();
	}
	return chatname;
}

function extractTwitchBadgeText(root) {
	if (!root) {
		return "";
	}

	var badges = [];
	var badgeNodes = root.querySelectorAll("button[data-a-target='chat-badge'] img, [data-a-target='chat-badge'] img, .chat-badge");
	for (var i = 0; i < badgeNodes.length; i += 1) {
		var badgeNode = badgeNodes[i];
		var badgeText = "";
		if (badgeNode) {
			badgeText = badgeNode.getAttribute("aria-label") || badgeNode.getAttribute("alt") || badgeNode.textContent || "";
		}
		if (badgeText) {
			badges.push(badgeText);
		}
	}

	return badges.join(" ").trim();
}

function extractTwitchMembershipText(root) {
	if (!root) {
		return "";
	}

	var messageNode = root.querySelector("[data-a-target='chat-message-text'], [data-a-target='chat-line-message-body'], [data-test-selector='chat-line-message-body']");
	var parts = [
		root.getAttribute ? root.getAttribute("aria-label") : "",
		root.getAttribute ? root.getAttribute("data-a-user") : "",
		extractTwitchBadgeText(root),
		messageNode ? (messageNode.textContent || "") : ""
	];
	return parts.filter(Boolean).join(" ").toLowerCase();
}

function extractTwitchCheerText(root, membershipText, chatmessage, ariaLabel) {
	if (!root) {
		return "";
	}

	var cheerAmountNode = root.querySelector(".chat-line__message--cheer-amount, [data-a-target='chat-message-cheer-amount']");
	if (cheerAmountNode) {
		var cheerText = (cheerAmountNode.textContent || cheerAmountNode.innerText || "").trim();
		if (cheerText) {
			return cheerText;
		}
	}

	var haystack = [ariaLabel, membershipText, chatmessage, root.innerText || ""].filter(Boolean).join(" ");
	var cheerMatch = haystack.match(/\b(\d{1,6})\s*bits?\b/i);
	if (cheerMatch && cheerMatch[1]) {
		var bitsValue = Number(cheerMatch[1]);
		if (Number.isFinite(bitsValue) && bitsValue > 0) {
			return bitsValue === 1 ? "1 bit" : bitsValue + " bits";
		}
	}

	return "";
}

function extractTwitchMessageData(element) {
	var root = resolveTwitchMessageRoot(element) || element;
	if (!root) {
		return null;
	}

	var chatname = extractTwitchAuthorName(root);
	if (showOnlyFirstName && chatname) {
		chatname = chatname.replace(/ .*/, "");
	}
	if (!chatname) {
		chatname = "Twitch";
	}

	var chatmessage = extractTwitchMessageText(root);
	var badgeText = extractTwitchBadgeText(root);
	var membershipText = extractTwitchMembershipText(root);
	var ariaLabel = root.getAttribute ? String(root.getAttribute("aria-label") || "") : "";
	var dataUser = root.getAttribute ? String(root.getAttribute("data-a-user") || "") : "";
	var hasMembership = false;
	var hasDonation = false;
	var chatdonation = false;
	var chatsticker = false;

	if (/[^\w](?:subscribed|subscription|renewed|resub|resubbed|sub gift|gifted sub|membership|subiversary)[^\w]/i.test(" " + membershipText + " ")) {
		hasMembership = true;
	}
	if (/(?:\b(?:cheer|bits?)\b|gifted\s+\d+|gift\s+sub|gifted\s+sub)/i.test(" " + membershipText + " ") || /(?:\bcheer\b|\bbits?\b)/i.test(chatmessage)) {
		hasDonation = true;
	}
	chatdonation = extractTwitchCheerText(root, membershipText, chatmessage, ariaLabel);
	if (chatdonation) {
		hasDonation = true;
	}

	var subscriptionMonths = extractTwitchSubscriptionMonths(ariaLabel + " " + membershipText, badgeText, chatmessage);
	var avatarFromDom = extractTwitchAvatarFromDom(root);
	var chatimg = avatarFromDom || (runtime.getRuntimeUrl ? runtime.getRuntimeUrl("twitch.png") : "twitch.png");
	var eventType = "message";
	if (hasMembership) {
		eventType = "sub";
	} else if (hasDonation) {
		eventType = "superchat";
	}
	if (chatsticker) {
		eventType = "superchat";
	}

	var hasMembershipText = hasMembership ? '<div class="donation membership">NEW MEMBER!</div>' : '';
	var hasDonationText = "";
	if (chatdonation) {
		hasDonationText = '<div class="cheer">' + chatdonation + '</div>';
	}

	var backgroundColor = "";
	var textColor = "";
	if (root.style && root.style.getPropertyValue('--yt-live-chat-paid-message-primary-color')) {
		backgroundColor = "background-color: " + root.style.getPropertyValue('--yt-live-chat-paid-message-primary-color') + ";";
		textColor = "color: #111;";
	}
	if (root.style && root.style.getPropertyValue('--yt-live-chat-sponsor-color')) {
		backgroundColor = "background-color: " + root.style.getPropertyValue('--yt-live-chat-sponsor-color') + ";";
		textColor = "color: #111;";
	}

	var data = {
		chatname: chatname,
		chatbadges: badgeText,
		backgroundColor: backgroundColor,
		textColor: textColor,
		chatmessage: chatmessage,
		chatimg: chatimg,
		hasDonation: hasDonationText,
		hasMembership: hasMembershipText,
		months: subscriptionMonths,
		currency: hasDonation ? "BITS" : "",
		type: "twitch",
		platform: "twitch",
		eventType: eventType,
		feed: true,
		timestamp: Date.now()
	};

	return {
		root: root,
		signature: buildTwitchMessageSignature(root),
		data: data
	};
}

function sendTwitchFeed(element, signature) {
	var root = resolveTwitchMessageRoot(element) || element;
	if (!isTwitchMessageRoot(root)) {
		twitchLog("skip element", {
			reason: "not_twitch_node",
			className: element && element.className
		});
		return;
	}

	var payload = extractTwitchMessageData(root);
	if (!payload) {
		return;
	}

	var nextSignature = signature || payload.signature;
	if (nextSignature && root.dataset.feedSignature === nextSignature) {
		twitchLog("skip element", {
			reason: "already_sent",
			className: root && root.className
		});
		return true;
	}

	var data = payload.data;

	root.style.backgroundColor = "#666";
	$(root).addClass("shown-comment");

	if (nextSignature) {
		root.dataset.feedSignature = nextSignature;
	}
	twitchLog("captured element", {
		chatname: data.chatname,
		hasDonation: !!data.hasDonation,
		hasMembership: !!data.hasMembership,
		messagePreview: String(data.chatmessage).slice(0, 80)
	});

	if (pushFeedMessage(data)) {
		root.dataset.feedSent = "1";
	}
	return true;
}

function buildTwitchMessageSignature(element) {
	var root = resolveTwitchMessageRoot(element) || element;
	if (!root) {
		return "";
	}

	var chatname = extractTwitchAuthorName(root);
	var chatmessage = extractTwitchMessageText(root);
	var badgeText = extractTwitchBadgeText(root);
	var ariaLabel = root.getAttribute ? String(root.getAttribute("aria-label") || "") : "";
	var dataUser = root.getAttribute ? String(root.getAttribute("data-a-user") || "") : "";
	return [dataUser.trim(), ariaLabel.trim(), chatname.trim(), String(chatmessage).trim(), badgeText.trim()].join("|");
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
  startTwitchConnections();
  startTwitchSweep();
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
		"[data-test-selector='chat-line-message']",
		"[data-a-target='chat-message-username']",
		"[data-a-target='chat-line-message-body']",
		"[data-test-selector='chat-line-message-body']",
		"[data-a-target='chat-message-text']",
		"[data-a-target='chat-message-cheer-amount']",
		"div[data-a-target='chat-message']"
	];
	var results = [];

	if (isTwitchMessageRoot(node)) {
		results.push(node);
	}

	if (node.querySelectorAll) {
		for (var i = 0; i < selectors.length; i += 1) {
			var selector = selectors[i];
			var found = node.querySelectorAll(selector);
			for (var j = 0; j < found.length; j += 1) {
				var root = resolveTwitchMessageRoot(found[j]) || found[j];
				if (root) {
					results.push(root);
				}
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

	var root = resolveTwitchMessageRoot(candidate) || candidate;
	twitchLog("processing candidate", {
		tagName: root.tagName,
		className: root.className,
		textPreview: root.innerText ? String(root.innerText).slice(0, 80) : ""
	});
	var signature = buildTwitchMessageSignature(root);
	if (signature && root.dataset.feedSignature === signature) {
		return false;
	}
	var sent = sendTwitchFeed(root, signature) === true;

	// Check for highlight words
	var chattext = $(root).find("#message").text() || root.innerText || "";
	var chatWords = chattext.split(" ");
	if (!highlightWords){
		highlightWords=[];
	}
	var highlights = chatWords.filter(value => highlightWords.includes(value.toLowerCase().replace(/[^a-z0-9]/gi, '')));
	$(root).removeClass("shown-comment");
	if(highlights.length > 0) {
		$(root).addClass("highlighted-comment");
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
	if (!twitchVisibilityListenerBound) {
		twitchVisibilityListenerBound = true;
		document.addEventListener("visibilitychange", updateTwitchSweepPolicy);
	}

	updateTwitchSweepPolicy();
	if (!document.hidden) {
		sweepTwitchMessages();
	}
}

function stopTwitchSweep() {
	if (!twitchSweepTimer) {
		return;
	}

	clearInterval(twitchSweepTimer);
	twitchSweepTimer = null;
	twitchSweepInterval = 0;
}

function updateTwitchSweepPolicy() {
	var nextInterval = document.hidden ? 30000 : 0;
	if (twitchSweepInterval === nextInterval && !nextInterval) {
		return;
	}

	stopTwitchSweep();

	if (!nextInterval) {
		sweepTwitchMessages();
		return;
	}

	twitchSweepInterval = nextInterval;
	twitchSweepTimer = setInterval(function () {
		sweepTwitchMessages();
	}, nextInterval);
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
	
