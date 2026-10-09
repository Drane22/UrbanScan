import { useRef } from "react";

export function DestinationForm({
  draft,
  pending,
  error,
  hasArtifact,
  onChange,
  onSubmit,
}: {
  draft: string;
  pending: boolean;
  error: string | null;
  hasArtifact: boolean;
  onChange: (value: string) => void;
  onSubmit: () => Promise<boolean>;
}): React.JSX.Element {
  const input = useRef<HTMLInputElement>(null);
  return (
    <form
      className="destination-form"
      aria-label="Destination"
      onSubmit={async (event) => {
        event.preventDefault();
        if (await onSubmit()) {
          input.current?.blur();
          const result = document.getElementById("result");
          if (result) {
            const bounds = result.getBoundingClientRect();
            if (bounds.bottom < 0 || bounds.top > window.innerHeight)
              result.scrollIntoView({
                block: "start",
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                  ? "instant"
                  : "smooth",
              });
          }
        }
      }}
    >
      <label htmlFor="qr-content">Destination</label>
      <div className="destination-row">
        <input
          ref={input}
          id="qr-content"
          value={draft}
          onChange={(event) => onChange(event.target.value)}
          placeholder="example.com"
          inputMode="url"
          enterKeyHint="go"
          autoCorrect="off"
          autoCapitalize="none"
          autoComplete="url"
          spellCheck={false}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "input-error" : undefined}
        />
        <button
          className={hasArtifact ? "generate-button" : "primary-button"}
          type="submit"
          disabled={pending}
        >
          {pending ? "Generating…" : "Generate"}
        </button>
      </div>
      {error && (
        <p id="input-error" className="field-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
