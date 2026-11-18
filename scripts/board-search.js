import { boardElements } from "./board-elements.js";
import {
    filterTaskCards,
    updateEmptyColumnMessages
} from "./board-render.js";

let activeSearchQuery = "";

/**
 * Returns the currently active normalized search query.
 * @returns {string} Active search query.
 */
export function getActiveSearchQuery() {
    return activeSearchQuery;
}

/**
 * Updates the empty search-result message.
 * @param {string} query Normalized search query.
 * @param {number} visibleTaskCount Number of matching cards.
 */
function updateSearchMessage(query, visibleTaskCount) {
    boardElements.boardSearchEmpty.hidden = query.length === 0 || visibleTaskCount > 0;
}

/**
 * Applies a search query to the board.
 * @param {string} query Normalized search query.
 */
export function applyBoardSearchQuery(query) {
    const visibleTaskCount = filterTaskCards(query);
    updateEmptyColumnMessages(query);
    updateSearchMessage(query, visibleTaskCount);
}

/**
 * Filters tasks while the user types.
 */
function handleBoardSearchInput() {
    activeSearchQuery = boardElements.boardSearchInput.value.trim().toLowerCase();
    applyBoardSearchQuery(activeSearchQuery);
}

/**
 * Applies a submitted board search.
 * @param {SubmitEvent} event Search form submission.
 */
function handleBoardSearchSubmit(event) {
    event.preventDefault();
    const query = boardElements.boardSearchInput.value.trim().toLowerCase();
    if (!query) return;
    activeSearchQuery = query;
    boardElements.boardSearchInput.value = "";
    applyBoardSearchQuery(activeSearchQuery);
}

/**
 * Clears the active board search.
 */
function clearBoardSearch() {
    boardElements.boardSearchInput.value = "";
    activeSearchQuery = "";
    applyBoardSearchQuery(activeSearchQuery);
}

/**
 * Initializes board search event handlers.
 */
export function initializeBoardSearch() {
    boardElements.boardSearchInput.addEventListener("input", handleBoardSearchInput);
    boardElements.boardSearchForm.addEventListener("submit", handleBoardSearchSubmit);
    boardElements.boardSearchButton.addEventListener("dblclick", clearBoardSearch);
}
