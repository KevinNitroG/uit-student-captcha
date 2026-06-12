import { describe, expect, it, vi } from "vitest";
import type { ProviderConfiguration } from "uit-student-captcha-config-core";
import type { OcrResolver } from "../model/ocr/OcrResolver.ts";
import { CaptchaViewModel } from "../viewmodel/CaptchaViewModel.ts";
import { PortalView } from "./PortalView.ts";
import { fakeHttpClient, jsonResponse } from "../../test/helpers/mocks.ts";

const http = fakeHttpClient(() => jsonResponse(200, {}));

const oneProvider: ProviderConfiguration = {
  version: 1,
  timeoutMs: 15000,
  providers: [
    { id: "p", provider: "easyocr", endpoint: "https://x", enabled: true, accessKey: "k" },
  ],
};

function renderSigninForm(): void {
  document.body.innerHTML = `
    <form id="user-login-form">
      <input id="edit-name" name="name" />
      <input id="edit-pass" name="pass" type="password" />
      <div class="captcha">
        <div class="english-captcha-image">
          <img src="https://student.uit.edu.vn/sites/default/files/english_captcha/captcha_1.png" />
        </div>
      </div>
      <input id="edit-english-captcha-answer" name="english_captcha_answer" />
      <input id="edit-submit--2" name="op" type="submit" value="Log in" />
    </form>`;
}

function viewModelSolvingTo(text: string): CaptchaViewModel {
  const stub: OcrResolver = {
    id: "stub",
    resolve: () => Promise.resolve({ provider: "stub", rawText: text, text, confidence: null }),
  };
  return new CaptchaViewModel(oneProvider, http, () => stub);
}

describe("PortalView", () => {
  it("fills only the answer input and never touches credentials/submit", async () => {
    renderSigninForm();
    const view = new PortalView(viewModelSolvingTo("old"), {
      extractBytes: () => Promise.resolve(new Blob(["x"])),
    });

    await view.run();

    expect((document.querySelector("#edit-english-captcha-answer") as HTMLInputElement).value).toBe("old");
    expect((document.querySelector("#edit-name") as HTMLInputElement).value).toBe("");
    expect((document.querySelector("#edit-pass") as HTMLInputElement).value).toBe("");
    expect((document.querySelector("#edit-submit--2") as HTMLInputElement).value).toBe("Log in");
  });

  it("dispatches input/change so Drupal sees the value", async () => {
    renderSigninForm();
    const answer = document.querySelector("#edit-english-captcha-answer") as HTMLInputElement;
    const onInput = vi.fn();
    answer.addEventListener("input", onInput);

    await new PortalView(viewModelSolvingTo("xyz"), {
      extractBytes: () => Promise.resolve(new Blob(["x"])),
    }).run();

    expect(onInput).toHaveBeenCalledOnce();
  });

  it("is a no-op with one info log when no signin form is present", async () => {
    document.body.innerHTML = `<div>not a login page</div>`;
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    const status = await new PortalView(viewModelSolvingTo("old")).run();

    expect(status).toBeNull();
    expect(info).toHaveBeenCalled();
  });
});
