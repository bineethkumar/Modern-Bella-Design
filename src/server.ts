import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

import { renderErrorPage } from "./lib/error-page";
import { applySecurityHeaders } from "./lib/security-headers.server";

/** Server entry: every response gets the site's security headers. */
export default createServerEntry({
  async fetch(request) {
    try {
      return applySecurityHeaders(await handler.fetch(request));
    } catch (error) {
      console.error(error);
      return applySecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
});
