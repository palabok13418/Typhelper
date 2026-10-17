export type MusApiComputePolicy = "mac-local" | "hybrid-30-70";

declare global {
  interface Window {
    __MUS_API_COMPUTE_POLICY__?: MusApiComputePolicy;
  }
}

let activePolicy: MusApiComputePolicy = "hybrid-30-70";

function isVerifiedM2PlusCapability(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const caps = value as Record<string, unknown>;
  const platform = String(caps.platform || caps.os || "").toLowerCase();
  const architecture = String(caps.architecture || caps.arch || "").toLowerCase();
  const model = String(caps.chipModel || caps.soc || "");
  const match = model.match(/\bM(\d+)\b/i);
  const generation = Number(caps.chipGeneration || (match ? match[1] : 0));
  return /^(macos|mac os|darwin)$/.test(platform)
    && /^(arm64|arm64e|aarch64)$/.test(architecture)
    && Number.isFinite(generation)
    && generation >= 2
    && caps.nativeComputeReady === true
    && caps.bundledLibrariesReady === true
    && caps.localAIReady === true
    && caps.audioDecodeReady === true;
}

function parentOrigin(): string {
  if (typeof document === "undefined" || !document.referrer) return "";
  try { return new URL(document.referrer).origin; } catch { return ""; }
}

if (typeof window !== "undefined" && window.parent !== window) {
  window.addEventListener("message", (event: MessageEvent) => {
    if (event.source !== window.parent) return;
    const expectedOrigin = parentOrigin();
    if (!expectedOrigin || event.origin !== expectedOrigin) return;
    const data = event.data;
    if (!data || data.type !== "MUS_API_COMPUTE_POLICY" || data.version !== 1) return;
    const requested = data.policy === "mac-local" && isVerifiedM2PlusCapability(data.capabilities)
      ? "mac-local"
      : "hybrid-30-70";
    activePolicy = requested;
    window.__MUS_API_COMPUTE_POLICY__ = requested;
    window.dispatchEvent(new CustomEvent("mus-api-compute-policy-changed", {
      detail: { policy: requested }
    }));
    try {
      window.parent.postMessage({ type: "TYPHELPER_COMPUTE_POLICY_ACK", version: 1, policy: requested }, event.origin);
    } catch { /* A missing parent acknowledgement does not block typing practice. */ }
  });
}

export function getComputePolicy(): MusApiComputePolicy {
  return activePolicy;
}
