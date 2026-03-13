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
        <div class="bg-text text-bg absolute right-0 bottom-full mb-2 px-2 py-1 font-mono text-[10px] whitespace-nowrap">
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
