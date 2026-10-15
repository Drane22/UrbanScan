export function DestinationForm({
  draft,
  pending,
  error,
  onChange,
  onSubmit,
}: {
  draft: string;
  pending: boolean;
  error: string | null;
  onChange: (value: string) => void;
  onSubmit: () => Promise<boolean>;
}): React.JSX.Element {
  return (
    <form
      className="destination-form"
      aria-label="Destination"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit();
      }}
    >
      <label htmlFor="qr-content">Your link</label>
      <div className="destination-row">
        <input
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
          aria-describedby={error ? "input-error" : "input-status"}
        />
      </div>
      {error ? (
        <p id="input-error" className="field-error" role="alert">
          {error}
        </p>
      ) : (
        <p id="input-status" className="input-status" role="status">
          {pending ? "Updating your QR…" : "Updates automatically"}
        </p>
      )}
    </form>
  );
}
