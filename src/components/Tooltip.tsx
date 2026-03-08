import type { ComponentChildren } from "preact";

type TooltipProps = {
  text: string;
  visible: boolean;
  class?: string;
  children: ComponentChildren;
};

export function Tooltip({
  text,
  visible,
  class: className,
  children,
}: TooltipProps) {
  return (
    <div class={`relative inline-block${className ? ` ${className}` : ""}`}>
      {visible && (
        <div
          class="absolute right-0 bottom-full mb-2 font-mono text-[10px] whitespace-nowrap"
          style="background-color: var(--color-text); color: var(--color-bg); padding: 0.25rem 0.5rem;"
        >
          {text}
          <div
            class="absolute right-2"
            style="top: 100%; width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 5px solid var(--color-text);"
          />
        </div>
      )}
      {children}
    </div>
  );
}
