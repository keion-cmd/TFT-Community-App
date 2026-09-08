// Google sign-in via Supabase OAuth, using an in-app browser session.
// Uses the Expo scheme declared in app.json (do not hardcode a different value here).

import * as WebBrowser from "expo-web-browser";

import appConfig from "../../app.json";
import { supabase } from "./supabase";

const REDIRECT_URL = `${appConfig.expo.scheme}://`;

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: REDIRECT_URL,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    return { error };
  }

  if (!data?.url) {
    return { error: new Error("No auth URL returned from Supabase.") };
  }

  const result = await WebBrowser.openAuthSessionAsync(
    data.url,
    REDIRECT_URL,
  );

  if (result.type !== "success" || !result.url) {
    if (result.type === "cancel" || result.type === "dismiss") {
      return { error: null, cancelled: true };
    }
    return { error: new Error("Google sign-in was not completed.") };
  }

  const params = parseTokensFromUrl(result.url);

  if (!params.access_token || !params.refresh_token) {
    return { error: new Error("Google sign-in did not return a session.") };
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: params.access_token,
    refresh_token: params.refresh_token,
  });

  if (sessionError) {
    return { error: sessionError };
  }

  return { error: null };
}

function parseTokensFromUrl(url: string): Record<string, string> {
  const fragment = url.split("#")[1] ?? url.split("?")[1] ?? "";
  const searchParams = new URLSearchParams(fragment);
  const result: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}
