export function readErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = error.code;

    if (typeof code === "string") {
      return code;
    }
  }

  return "";
}
