/**
 * Shared lite-path detection for index shell, boot, and audits.
 */
(function (g) {
  'use strict';
  function auditEnv() {
    try {
      if (g.navigator.webdriver) return true;
      if (/HeadlessChrome/i.test(g.navigator.userAgent || '')) return true;
    } catch (e) {}
    return false;
  }
  function explicitLiteQuery() {
    return /[?&](lite|nosplash)=1/.test(g.location.search || '');
  }
  function stayOnLiteShell() {
    if (auditEnv()) return true;
    if (explicitLiteQuery()) return true;
    return false;
  }
  function skipOrreryBoot() {
    if (explicitLiteQuery()) return true;
    return auditEnv();
  }
  g.__apAuditEnv = auditEnv;
  g.__apStayOnLiteShell = stayOnLiteShell;
  g.__apSkipOrreryBoot = skipOrreryBoot;
})(window);