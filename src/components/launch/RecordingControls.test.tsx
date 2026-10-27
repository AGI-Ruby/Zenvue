import React from "react";
import { renderToString } from "react-dom/server";
import { expect, it, vi } from "vitest";
vi.mock("@/contexts/I18nContext", () => ({ useScopedT: () => (key: string) => key }));
import { RecordingControls } from "./RecordingControls";

it("renders visible recording controls without throwing after the idle controls unmount", () => {
	const noop = () => {};
	const html = renderToString(
		<RecordingControls
			onHome={noop}
			paused={false}
			microphoneEnabled={false}
			elapsed={3}
			onPauseResume={noop}
			onStopRecording={noop}
			onCancelRecording={noop}
			formatTime={() => "00:03"}
		/>,
	);
	expect(html).toContain("00:03");
	expect(html).toContain("recording.stop");
});
