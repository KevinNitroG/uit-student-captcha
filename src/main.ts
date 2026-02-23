const catpchaRegexPattern = /\(([^)]+)\)[^)]*$/;
function main() {
  const group = document.querySelector(
    ".form-item-english-captcha-answer",
  ) as HTMLDivElement;
  if (!group) {
    console.log("UIT Student Captcha group not found, skipping");
    return;
  }
  const label = group.querySelector("label") as HTMLLabelElement;
  if (!label) {
    console.log("UIT Student Captcha label not found");
    return;
  }
  const labelText = label.textContent;
  if (!labelText) {
    console.log("UIT Student Captcha label text not found");
    return;
  }
  const input = group.querySelector("input") as HTMLInputElement;
  if (!input) {
    console.log("UIT Student Captcha input not found");
    return;
  }
  const captcha = catpchaRegexPattern.exec(labelText)?.[1];
  if (!captcha) {
    console.log("UIT Student Captcha not found in label text");
    return;
  }
  input.value = captcha;
  console.log("UIT Student Captcha filled with value:", captcha);
}

main();
