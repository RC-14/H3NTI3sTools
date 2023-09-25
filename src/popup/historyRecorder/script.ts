import { qs, sendRuntimeMessage } from '/src/lib/utils';

const privateHistoryPermissionWarningElement = qs<HTMLHeadingElement>('h4#privateHistoryPermissionWarning');
if (!(privateHistoryPermissionWarningElement instanceof HTMLHeadingElement)) throw new Error("Didn't find privateHistoryPermissionWarningElement.");

const privateHistoryToggleButton = qs<HTMLButtonElement>('button#privateHistoryToggle');
if (!(privateHistoryToggleButton instanceof HTMLButtonElement)) throw new Error("Didn't find privateHistoryToggleButton.");

const PRIVATE_HISTORY_TOGGLE_BUTTON_ENABLED_TEXT = 'Disable recording history for private windows.';
const PRIVATE_HISTORY_TOGGLE_BUTTON_DISABLED_TEXT = 'Enable recording history for private windows.';

let privateHistoryEnabled = false;

const updatePrivateHistoryToggleButtonText = () => {
	if (privateHistoryEnabled) {
		privateHistoryToggleButton.innerText = PRIVATE_HISTORY_TOGGLE_BUTTON_ENABLED_TEXT;
	} else {
		privateHistoryToggleButton.innerText = PRIVATE_HISTORY_TOGGLE_BUTTON_DISABLED_TEXT;
	}
};

sendRuntimeMessage('background', 'historyRecorder', 'hasIncognitoAccess').then((response) => {
	if (typeof response !== 'boolean') throw new Error(`Got an invalid response when asking historyRecorder for incognito access status: ${response}`);
	if (response) return;
	privateHistoryPermissionWarningElement.classList.remove('hidden');
});

sendRuntimeMessage('background', 'historyRecorder', 'isPrivateHistoryEnabled').then((response) => {
	if (typeof response !== 'boolean') throw new Error(`Got an invalid response when asking historyRecorder for private history status: ${response}`);

	privateHistoryEnabled = response;

	updatePrivateHistoryToggleButtonText();

	privateHistoryToggleButton.addEventListener('click', async (event) => {
		privateHistoryToggleButton.disabled = true;

		await sendRuntimeMessage('background', 'historyRecorder', privateHistoryEnabled ? 'disablePrivateHistory' : 'enablePrivateHistory');
		privateHistoryEnabled = !privateHistoryEnabled;

		updatePrivateHistoryToggleButtonText();

		privateHistoryToggleButton.disabled = false;
	}, { passive: true });
});
