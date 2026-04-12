(function (global) {
  if (global.OverlayAvatarHelpers) {
    return;
  }

  function extractAvatarSrcFromDom(element, selectors) {
    if (!element || !element.querySelector) {
      return "";
    }

    const list = Array.isArray(selectors) ? selectors : [];
    for (const selector of list) {
      const avatarNode = element.querySelector(selector);
      if (avatarNode && avatarNode.src) {
        return avatarNode.src;
      }
    }

    return "";
  }

  global.OverlayAvatarHelpers = {
    extractAvatarSrcFromDom
  };
})(window);
