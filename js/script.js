var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
document.addEventListener('DOMContentLoaded', function () {
    var _a, _b, _c;
    console.log('DOM готов');
    var commentManager = new Input();
    commentManager.LoadCommentsFromStorage();
    commentManager.InitFilter();
    var sendButton = new Button(commentManager);
    commentManager.SetSendButton(sendButton);
    (_a = document.getElementById('comments')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', function (e) {
        var target = e.target;
        // Ответить
        if (target.closest('.add-answer')) {
            var commentBlock = target.closest('.comment-block');
            if (commentBlock) {
                commentManager.ShowReplyBox(commentBlock);
            }
            return;
        }
        // Рейтинг
        var ratingBtn = target.closest('.rating-button');
        if (ratingBtn) {
            var action = ratingBtn.dataset.action;
            var commentBlock = ratingBtn.closest('.comment-block');
            var commentId = commentBlock === null || commentBlock === void 0 ? void 0 : commentBlock.dataset.commentId;
            if (commentId && (action === 'up' || action === 'down')) {
                commentManager.HandleVote(commentId, action);
            }
            return;
        }
        // Избранное
        var favoritesBtn = target.closest('.add-favorites');
        if (favoritesBtn) {
            var commentBlock = favoritesBtn.closest('.comment-block');
            var commentId = commentBlock === null || commentBlock === void 0 ? void 0 : commentBlock.dataset.commentId;
            if (commentId) {
                commentManager.ToggleFavorite(commentId);
            }
            return;
        }
    });
    // Переключение вкладок
    (_b = document.querySelector('.button-comment')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', function (e) {
        e.preventDefault();
        commentManager.ShowAllComments();
    });
    (_c = document.querySelector('.favorites-button')) === null || _c === void 0 ? void 0 : _c.addEventListener('click', function (e) {
        e.preventDefault();
        commentManager.ShowFavoriteComments();
    });
    commentManager.RebuildInputForm();
    window.addEventListener('resize', function () {
        clearTimeout(window.resizeTimeout);
        window.resizeTimeout = setTimeout(function () {
            commentManager.LoadCommentsFromStorage();
            commentManager.RebuildInputForm();
        }, 20);
    });
});
function PadZero(num) {
    return num < 10 ? '0' + num : String(num);
}
function GenerateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function isDesktop() {
    return window.innerWidth >= 1300;
}
/// Счетчик общего количества комментариев
function GetCountComments() {
    var allBlocks = document.querySelectorAll('.comment-block');
    var count = allBlocks.length;
    var element = document.getElementById("count-comments");
    if (element) {
        element.textContent = "(".concat(count, ")");
    }
}
var Input = /** @class */ (function () {
    function Input() {
        var _this = this;
        var _a;
        this.sendButton = null;
        this.countSymbols = 0;
        this.replyToId = null;
        this.replyDraftText = '';
        this.currentFilter = 'date';
        this.currentOrder = 'desc';
        this.filterDropdown = null;
        this.filterButton = null;
        this.currentView = 'all';
        this.inputElement = document.getElementById("input-comments");
        this.restrictionsElement = document.querySelector('.restrictions');
        (_a = this.inputElement) === null || _a === void 0 ? void 0 : _a.addEventListener('input', function () { return _this.TypingText(); });
        this.commentsContainer = document.getElementById("comments");
    }
    /// Отправка комментария
    Input.prototype.SendComment = function () {
        if (this.inputElement) {
            var textComment = this.inputElement.value;
            console.log("Текст комментария:", textComment);
            this.ContainerComment(textComment);
            // Сброс
            this.OnReset();
        }
    };
    /// Контейнер комментариев
    Input.prototype.ContainerComment = function (textComment) {
        var _a, _b;
        if (this.commentsContainer) {
            var avatarElem = document.getElementById("my-avatar");
            var avatarSrc = (_a = avatarElem === null || avatarElem === void 0 ? void 0 : avatarElem.src) !== null && _a !== void 0 ? _a : '';
            var nameElem = document.getElementById("my-name");
            var name_1 = (_b = nameElem === null || nameElem === void 0 ? void 0 : nameElem.textContent) !== null && _b !== void 0 ? _b : 'Аноним';
            var now = new Date();
            var date = "".concat(PadZero(now.getDate()), ".").concat(PadZero(now.getMonth() + 1), ".").concat(now.getFullYear(), " ").concat(PadZero(now.getHours()), ":").concat(PadZero(now.getMinutes()));
            var newComment = {
                id: GenerateId(),
                avatarSrc: avatarSrc,
                name: name_1,
                text: textComment,
                date: date,
                rating: 0,
                hasVotedUp: false,
                hasVotedDown: false,
                isFavorite: false
            };
            var savedComments = this.GetSavedComments();
            savedComments.push(newComment);
            localStorage.setItem('comments', JSON.stringify(savedComments));
            this.AppendCommentToDOM(newComment);
            GetCountComments();
        }
    };
    /// Получение сохраненых комментариев
    Input.prototype.GetSavedComments = function () {
        var saved = localStorage.getItem('comments');
        if (!saved)
            return [];
        try {
            return JSON.parse(saved);
        }
        catch (e) {
            console.error('Ошибка при чтении комментариев из localStorage', e);
            return [];
        }
    };
    /// Создание основного комментария
    Input.prototype.BuildRootCommentHtml = function (comment) {
        var isReply = !!comment.parentId;
        var classes = ['comment-block'];
        if (isReply)
            classes.push('lvl-2-nesting');
        var ratingClass = comment.hasVotedUp ? 'voted-up' : comment.hasVotedDown ? 'voted-down' : '';
        if (isDesktop()) {
            return "\n                <div class=\"".concat(classes.join(' '), "\" data-comment-id=\"").concat(comment.id, "\">\n                    <img class=\"avatar\" src=\"").concat(this.EscapeHtml(comment.avatarSrc), "\" width=\"61\" height=\"61\">\n                    <div class=\"input-container\">\n                        <div class=\"comment-information-container\">\n                            <h3 class=\"name-commentator\">").concat(this.EscapeHtml(comment.name), "</h3>\n                            <h5 class=\"comment-date-time\">").concat(this.EscapeHtml(comment.date), "</h5>\n                        </div>\n                        <p class=\"comment-text\">").concat(this.EscapeHtml(comment.text), "</p>\n                        <div class=\"buttons-comment-block\">\n                            <div class=\"answer-container\">\n                                <button class=\"buttons-comment add-answer\">\n                                    <svg width=\"22\" height=\"22\" viewBox=\"0 0 22 22\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n                                        <g opacity=\"0.4\">\n                                            <mask id=\"mask0_3_259\" style=\"mask-type:alpha\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"22\" height=\"22\">\n                                                <rect width=\"22\" height=\"22\" fill=\"url(#pattern0_3_259)\"/>\n                                            </mask>\n                                            <g mask=\"url(#mask0_3_259)\">\n                                                <rect x=\"-2\" y=\"-1\" width=\"26\" height=\"25\" fill=\"black\"/>\n                                            </g>\n                                        </g>\n                                        <defs>\n                                            <pattern id=\"pattern0_3_259\" patternContentUnits=\"objectBoundingBox\" width=\"1\" height=\"1\">\n                                                <use xlink:href=\"#image0_3_259\" transform=\"scale(0.01)\"/>\n                                            </pattern>\n                                            <image id=\"image0_3_259\" width=\"100\" height=\"100\" preserveAspectRatio=\"none\" xlink:href=\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAAEvElEQVR4nO2cW4hVVRiAvzONFOOMRWMD6aA1E4OJBVEveQHD7KGHSKiHoKIQAiPQCOshovAlXyL0pZdQH9QuFEQWEdHV7lEYJVFmiZYYRNNNytIzPfxn8njmXNZeZ+3173X2/8HPzJlhzvnX/82+rfXvDYZhGIZhGIZhFIz12gkYwhDwNDClnYgBVwAHEBkmRJnbgeOclmFClBgEdnGmCBOixCLgC5rLMCGRuQ34k9YyTEgkzgG20F6ECYnEBLAPNxkmJGfWAJO4yzAhOXE27rsoE5IzC4AP8JNhQgJzA/AL/jJMSCD6gc1Ale5kmJAAjALv0r0IExKAVcAxwskwIZ6cBTwCnCKsDBPiwQjwGuFFmBAPVgJHyU+GCXGkAjwAnCRfGSbEgbnAK+QvohRCKl3+/QrgKWB+gFxc+R34rRa/1n1/DPi2Lg4jJxWloALcD/xLvC0ja5wAvgJ2AncDlwF9eRRDm/OBPegX3CcmgZeBjcDFoQujwZXAQfQLGyr2I9dLl4QsUizWI7sB7SLmEVVgL3ATclFbaOqb1MoQ3yH/fLNDFC80jU1qZYqfgQeR9f5C0KxJrYxxpFYLNdo1qZU5XgeWdFFXL5Yg5+7agy9qnADupfsLaidcmtQsJF4Ehv3K3JksTWoWp+MIsNyj3m3pQza/wdBvXAJGgTfJ8YBvuyy/qAL3edTbiU6d5xatY7NHvZ2w017/2OJRb2fswtAvHvIptitlnjrxjSpwh0+xXRkCninAQFOKf4DrfIqdhbvo3en3PGKSCItgVyHT09qDTSU+AmZ5VToD5wLPKQ80pXjUr8zZmO7DKnKTQ1HiFNLjHIUVwA85D6gX4gCOC10hppFHkFab1QHey4UBZHBzkP3zeUiz3gW1uBBYCIwB47XfF4FNwMOxPqyv9mFFbCUdBq5B1jF2AF8S5sahrPE3csdxVFYBP3WZeGghzRhGbq97DGkFiiXlpUD5Z2Ie8LZHsjGFNDKOdJq8R/5bz9KcxtCWfuR0L4/B5c04svs9nEPuU8AbEcbQkuuRdpqUhEzTjzTO7Q2c/xQRT4ObMYrsClITUs8ywvYzvxo3/ZnMAh4n/duiryXMAl4VWBw596asQe7pSFUIyK7sHuQ+lW7G8UTsxFsxDnxKukKmWYjsenzHcRyZFywEvfLwmQrd3RWwNn7K7bkF+IN0hUxzNX4PSHhLI9lOTACfk7YQkMWor8l+cC/knVwDwHbSFgIy0foJ2aRsVMnUkTvp3OlSdAaRTnlXIe/opOnOpciMbKpCQBpDPsNNyElk+aDQDAG7SVcIyLrMIdyk3KqUY2bWIesIKQoB2dpdnqC3TStBH1J/GP+NdBZyUC07T+YAz5KmEIAn6SxlgVp2nlSADdpJeDJI55bcm9WyKykraS9kk15q5eV5Wgt5QTGv0jLGzLPGZA/svcJWWs9rDSnmVVouonUL7tKefKBXwTmEHEuaMWFCdNja4ufzTYgO7wPfNPn5vMI/rKuHmYtcm9RzVCMRQ7icmQf1j1UzKjkV4EfOFPK9HUP0mEJWFuuZbUJ0+bDh9YAJ0WVfw+sBlSyM/xmh4cAe5VF1RlvGal//QiYeDcMwDMMwDMMwDMMwjOb8B7T5oNqqo7gkAAAAAElFTkSuQmCC\"/>\n                                        </defs>\n                                    </svg>\n                                    \u041E\u0442\u0432\u0435\u0442\u0438\u0442\u044C\n                                </button>\n                            </div>\n                            <div class=\"favorites-container\">\n                                <button class=\"buttons-comment add-favorites\">\n                                    ").concat(this.GetFavoriteIconSvg(comment.isFavorite), "\n                                    <span class=\"favorites-text\">").concat(this.GetFavoriteButtonText(comment.isFavorite), "</span>\n                                </button>\n                            </div>\n                            <div class=\"rating-comment-container\">\n                                <button class=\"buttons-comment rating-button demotion\" data-action=\"down\">\n                                    <svg width=\"20\" height=\"23\" viewBox=\"0 0 20 23\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                                        <circle opacity=\"0.1\" cx=\"10\" cy=\"13\" r=\"10\" fill=\"black\"/>\n                                        <path d=\"M13.0696 11.6399V13.2955H7.26562V11.6399H13.0696Z\" fill=\"#FF0000\"/>\n                                    </svg>\n                                </button>\n                                <p class=\"rating-count ").concat(ratingClass, "\">").concat(comment.rating, "</p>\n                                <button class=\"buttons-comment rating-button increase\" data-action=\"up\">\n                                    <svg width=\"20\" height=\"23\" viewBox=\"0 0 20 23\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                                        <circle opacity=\"0.1\" cx=\"10\" cy=\"13\" r=\"10\" fill=\"black\"/>\n                                        <path d=\"M9.13281 17.169V8.52699H10.8523V17.169H9.13281ZM5.67472 13.7045V11.9851H14.3168V13.7045H5.67472Z\" fill=\"#8AC540\"/>\n                                    </svg>\n                                </button>\n                            </div>\n                        </div>\n                    </div>\n                </div>\n            ");
        }
        else {
            return "\n                <div class=\"".concat(classes.join(' '), "\" data-comment-id=\"").concat(comment.id, "\">\n                    <div class=\"input-container\">\n                        <div class=\"comment-information-container\">\n                            <img class=\"avatar\" src=\"").concat(this.EscapeHtml(comment.avatarSrc), "\" width=\"61\" height=\"61\">\n                            <h3 class=\"name-commentator\">").concat(this.EscapeHtml(comment.name), "</h3>\n                            <h5 class=\"comment-date-time\">").concat(this.EscapeHtml(comment.date), "</h5>\n                        </div>\n                        <p class=\"comment-text\">").concat(this.EscapeHtml(comment.text), "</p>\n                        <div class=\"buttons-comment-block\">\n                            <div class=\"answer-container\">\n                                <button class=\"buttons-comment add-answer\">\n                                    <!-- \u0442\u043E\u0442 \u0436\u0435 SVG -->\n                                    <svg width=\"22\" height=\"22\" viewBox=\"0 0 22 22\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n                                        <g opacity=\"0.4\">\n                                            <mask id=\"mask0_3_259\" style=\"mask-type:alpha\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"22\" height=\"22\">\n                                                <rect width=\"22\" height=\"22\" fill=\"url(#pattern0_3_259)\"/>\n                                            </mask>\n                                            <g mask=\"url(#mask0_3_259)\">\n                                                <rect x=\"-2\" y=\"-1\" width=\"26\" height=\"25\" fill=\"black\"/>\n                                            </g>\n                                        </g>\n                                        <defs>\n                                            <pattern id=\"pattern0_3_259\" patternContentUnits=\"objectBoundingBox\" width=\"1\" height=\"1\">\n                                                <use xlink:href=\"#image0_3_259\" transform=\"scale(0.01)\"/>\n                                            </pattern>\n                                            <image id=\"image0_3_259\" width=\"100\" height=\"100\" preserveAspectRatio=\"none\" xlink:href=\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAAEvElEQVR4nO2cW4hVVRiAvzONFOOMRWMD6aA1E4OJBVEveQHD7KGHSKiHoKIQAiPQCOshovAlXyL0pZdQH9QuFEQWEdHV7lEYJVFmiZYYRNNNytIzPfxn8njmXNZeZ+3173X2/8HPzJlhzvnX/82+rfXvDYZhGIZhGIZhFIz12gkYwhDwNDClnYgBVwAHEBkmRJnbgeOclmFClBgEdnGmCBOixCLgC5rLMCGRuQ34k9YyTEgkzgG20F6ECYnEBLAPNxkmJGfWAJO4yzAhOXE27rsoE5IzC4AP8JNhQgJzA/AL/jJMSCD6gc1Ale5kmJAAjALv0r0IExKAVcAxwskwIZ6cBTwCnCKsDBPiwQjwGuFFmBAPVgJHyU+GCXGkAjwAnCRfGSbEgbnAK+QvohRCKl3+/QrgKWB+gFxc+R34rRa/1n1/DPi2Lg4jJxWloALcD/xLvC0ja5wAvgJ2AncDlwF9eRRDm/OBPegX3CcmgZeBjcDFoQujwZXAQfQLGyr2I9dLl4QsUizWI7sB7SLmEVVgL3ATclFbaOqb1MoQ3yH/fLNDFC80jU1qZYqfgQeR9f5C0KxJrYxxpFYLNdo1qZU5XgeWdFFXL5Yg5+7agy9qnADupfsLaidcmtQsJF4Ehv3K3JksTWoWp+MIsNyj3m3pQza/wdBvXAJGgTfJ8YBvuyy/qAL3edTbiU6d5xatY7NHvZ2w017/2OJRb2fswtAvHvIptitlnjrxjSpwh0+xXRkCninAQFOKf4DrfIqdhbvo3en3PGKSCItgVyHT09qDTSU+AmZ5VToD5wLPKQ80pXjUr8zZmO7DKnKTQ1HiFNLjHIUVwA85D6gX4gCOC10hppFHkFab1QHey4UBZHBzkP3zeUiz3gW1uBBYCIwB47XfF4FNwMOxPqyv9mFFbCUdBq5B1jF2AF8S5sahrPE3csdxVFYBP3WZeGghzRhGbq97DGkFiiXlpUD5Z2Ie8LZHsjGFNDKOdJq8R/5bz9KcxtCWfuR0L4/B5c04svs9nEPuU8AbEcbQkuuRdpqUhEzTjzTO7Q2c/xQRT4ObMYrsClITUs8ywvYzvxo3/ZnMAh4n/duiryXMAl4VWBw596asQe7pSFUIyK7sHuQ+lW7G8UTsxFsxDnxKukKmWYjsenzHcRyZFywEvfLwmQrd3RWwNn7K7bkF+IN0hUxzNX4PSHhLI9lOTACfk7YQkMWor8l+cC/knVwDwHbSFgIy0foJ2aRsVMnUkTvp3OlSdAaRTnlXIe/opOnOpciMbKpCQBpDPsNNyElk+aDQDAG7SVcIyLrMIdyk3KqUY2bWIesIKQoB2dpdnqC3TStBH1J/GP+NdBZyUC07T+YAz5KmEIAn6SxlgVp2nlSADdpJeDJI55bcm9WyKykraS9kk15q5eV5Wgt5QTGv0jLGzLPGZA/svcJWWs9rDSnmVVouonUL7tKefKBXwTmEHEuaMWFCdNja4ufzTYgO7wPfNPn5vMI/rKuHmYtcm9RzVCMRQ7icmQf1j1UzKjkV4EfOFPK9HUP0mEJWFuuZbUJ0+bDh9YAJ0WVfw+sBlSyM/xmh4cAe5VF1RlvGal//QiYeDcMwDMMwDMMwDMMwjOb8B7T5oNqqo7gkAAAAAElFTkSuQmCC\"/>\n                                        </defs>\n                                    </svg>\n                                    \u041E\u0442\u0432\u0435\u0442\u0438\u0442\u044C\n                                </button>\n                            </div>\n                            <div class=\"favorites-container\">\n                                <button class=\"buttons-comment add-favorites\">\n                                    ").concat(this.GetFavoriteIconSvg(comment.isFavorite), "\n                                    <span class=\"favorites-text\">").concat(this.GetFavoriteButtonText(comment.isFavorite), "</span>\n                                </button>\n                            </div>\n                            <div class=\"rating-comment-container\">\n                                <button class=\"buttons-comment rating-button demotion\" data-action=\"down\">\n                                    <svg width=\"20\" height=\"23\" viewBox=\"0 0 20 23\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                                        <circle opacity=\"0.1\" cx=\"10\" cy=\"13\" r=\"10\" fill=\"black\"/>\n                                        <path d=\"M13.0696 11.6399V13.2955H7.26562V11.6399H13.0696Z\" fill=\"#FF0000\"/>\n                                    </svg>\n                                </button>\n                                <p class=\"rating-count ").concat(ratingClass, "\">").concat(comment.rating, "</p>\n                                <button class=\"buttons-comment rating-button increase\" data-action=\"up\">\n                                    <svg width=\"20\" height=\"23\" viewBox=\"0 0 20 23\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                                        <circle opacity=\"0.1\" cx=\"10\" cy=\"13\" r=\"10\" fill=\"black\"/>\n                                        <path d=\"M9.13281 17.169V8.52699H10.8523V17.169H9.13281ZM5.67472 13.7045V11.9851H14.3168V13.7045H5.67472Z\" fill=\"#8AC540\"/>\n                                    </svg>\n                                </button>\n                            </div>\n                        </div>\n                    </div>\n                </div>\n            ");
        }
    };
    /// Получение svg кнопки Избранное
    Input.prototype.GetFavoriteIconSvg = function (isFavorite) {
        if (isFavorite) {
            return "\n                <svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n                <g opacity=\"0.4\">\n                <mask id=\"mask0_3_263\" style=\"mask-type:alpha\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"24\" height=\"24\">\n                <rect width=\"24\" height=\"24\" fill=\"url(#pattern0_3_263)\"/>\n                </mask>\n                <g mask=\"url(#mask0_3_263)\">\n                <rect x=\"-1.25\" width=\"29.5\" height=\"27.5\" fill=\"black\"/>\n                </g>\n                </g>\n                <defs>\n                <pattern id=\"pattern0_3_263\" patternContentUnits=\"objectBoundingBox\" width=\"1\" height=\"1\">\n                <use xlink:href=\"#image0_3_263\" transform=\"scale(0.0104167)\"/>\n                </pattern>\n                <image id=\"image0_3_263\" width=\"96\" height=\"96\" preserveAspectRatio=\"none\" xlink:href=\"data:image/png;base64,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\"/>\n                </defs>\n                </svg>\n            ";
        }
        else {
            return "\n                <svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n                <mask id=\"mask0_3_291\" style=\"mask-type:alpha\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"24\" height=\"24\">\n                <rect width=\"24\" height=\"24\" fill=\"url(#pattern0_3_291)\"/>\n                </mask>\n                <g mask=\"url(#mask0_3_291)\">\n                <rect opacity=\"0.4\" x=\"2\" y=\"4\" width=\"21\" height=\"19\" fill=\"black\"/>\n                <path d=\"M3.5 9.00004C2.5 12.9999 8.83333 17.3333 12 20C20 14.4 21.1667 10.5001 20.5 9.00004C18.5 4.20004 13.8333 6.16667 12 8.00001C7 3.5 4.5 6.50002 3.5 9.00004Z\" fill=\"white\"/>\n                </g>\n                <defs>\n                <pattern id=\"pattern0_3_291\" patternContentUnits=\"objectBoundingBox\" width=\"1\" height=\"1\">\n                <use xlink:href=\"#image0_3_291\" transform=\"scale(0.0104167)\"/>\n                </pattern>\n                <image id=\"image0_3_291\" width=\"96\" height=\"96\" preserveAspectRatio=\"none\" xlink:href=\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAABmJLR0QA/wD/AP+gvaeTAAAKSklEQVR4nO2ce5AUxR3Hfz3v2feyu/fAQ+CAoDkFBAOUhocpgsbSIyASH8TCJFaSMmpSMZXEmKoz0aS0UlplJT5QimjKBxINSUAqGiMVkQsiormcJXgcdxx3t+zu7e3jdufdnT+QihqFmd3Zmz3pT9Xvr+3+9W9+3+menp3uBqBQKBQKhUKhUCgUCoVCoVAoFAqFQqHUFFTrBsjyDRHQisuxrlxBDH0msrQoEOABY5YA5hHLjSGGKwInFBEr/BNCvi3oH1sO1ySWi66bB3rhOssy5oChxhC2fIRgARHCAyAVGM4iHJtlODGNeHk7sIHtaM8fUrWI5SQ1EYBAB2MtfvtSoim3kbHR2Sgz0EKKIxyY+qmD8YUBxVtSJBRPguB/hRP9d6POrdmqYlmyvtkoZ3+JtNJClE22kJGBKNHKp66EGIBgDDPxliESjPUhUX6CnSptRlu3WtXE8olNue3QXLhqtaUU74JkTyvKHPMDwZU5kgIEprT1QSC6lw9Hb0G7nsk4qU4WXdto6tmHcGHkC2igewroSmVxAABEmjU4a3YPSP5H+f07fosASOXOPoprAiiLr5mGlJFNKHl4PhzvjbjlFwQJYMaCHuQL3yvsf/Hx0xUnAEid/5U7mLHcN+DIgVYwVNdCgUmTy9DS1kWkwA3SG3865IZLVwRQ519+BSllH0Q9b04Hy3TD5f8TP7tAWmbvluTIWtS59RNvZ7L86oCayz2P+ruWwGhSrkkcDAt4xvyjJBi/x//Wzo3VuqtaAGXeyp+R7OD3mKPdTdX6Oi1SAOPPLdynTQpdFt21Lffhn0pL1jRDLvs39tAb54FWrvnkAjfPHEFNrY/JB176aTV+qgq0NHflnTB08HYm3R+uxo8jeAnM2Yv+DdGGFcHXtqYBAMYWtTfCWP4V5r09bcgyxi0UiE0pGC3nPBZ65+XbK3VRsQD5eSuvZ1P9D7BDBxOV+qgYTgD93C92hmJ46XAxKATV4uvcwdfngTmOyf8A3Dg9S5pm3R1456UHKqlfkQDZ+e1zuNzADq73QEsl9d2A+COG2brgaQIkJLy/dxWoJcarWMypcwdxrGVV5K0d+53WdSwAgQ4m1/bqXuHd1y6seIrpElZsyigiFsNkh8ZvCPwkEAP6ORd3RXznLkD7NzrqhqzTtm49n/052991FdJKnNO6boOUgoyUouR1HAAEkFKYVApK/vtSR152UtNRt01f3B5E5dwNTDEjETjxNkLthKFSjkfl0TXZBVc76o2OBDDzhR8yQ+9P9/pi69XYoYOtppq+y0lObQtAABCjlVcjpcB4faH1aqCWENHKKwh02M6r7YLDF6xcwo4MzvD6IuvdmOzg1OTczmV282r7QYqV8vWokPF7O++pf5h8KoDjYzcAwKt2ytufyRjaeWBqJ7oa5dOxDABLP8ducVtDEIEOhuhqk9fde6IYNrQYsfmOZUuAw3P2xJGu0KmnTWO0UvDY3C9NtpNbW0MQIrgRGaqP2ClMAWKosmHycQAYPF1ZWwJYAI1gqAEqgD2IacgGa4bslLUnAMEMJoSlAtiDABCwkK102RIAY6RghAwCIFQX2pkBZhgdW5atj9A2nwHWKOHEEhXAHpjlVQOzo3bK2hLA5MxBg5dKPEC0utDODCxeLsuYP+0DGMDmNHRO1+5RkxNKXk/vJopZLFec1bNTs5Nb22/CJssdJwCz7ZY/k7FYLmm3rG0BCGLfs1h+KTOeH70nIBYnAkbc23bL2/431OCEv+pSQPe6e9e7mVJIMXhxu9282u4BDPbt1uTosFAanWq3zpmI4gsP47K+z2552z3ggr5dOUOUj2BAnt9ldWsIgcGJhy4c2n+a1b//w9knSY5/XJeDmucXWqemyNGyzgoPO8mpIwH8AWNrOZDo9/pC69WUYKxvYGDmDic5dSRAW3e3rnHiPoPlAQNQ+5AZnAgGw7+2DpztIXC8mkwV/bcXw5NpL/iY5SPNvZgN3+E0n44FuKRvX1KTfLtMlvf8ouvFDE4kBi+/dNGxTse7eSpa3Yax9KN8ePKySLZ/WiX1P2sUIs29hihWtEy9ogWtS5MH0rooP6uJ/jN+RqSJAVVnxc2X9L39kf0Kdql4eXoHALM8MWNvPNN7ISKkUjcTGoIYyCRaO5elei6udN9YxUu6OwCwyoob8qGmQa/vQq8sF24eNHluQzWb9qpaU39Z8t1uhQ88rQh+xetp4HhbWQyVVE7euGLwvao261W9l4oAoJdjM3bGcgMrOUuv+d6sesBieZyJnr19Zebwqmp9Vb2rBAGQHCOtzYTP6saI8XxYqLVZiIFUuKVLEyLXVpu7D/LnDi/EZp0bMEsvxvJD0z7L3SATbulVJf+K9uMHj7jhz9Vc/TkxfamsKE/FxpKe7R2rJdlQ81GV819zZban0y2fjrconYpny7n+df5Ej8lyyySjHHTTt9eM+hsGNUG+6cps7y43/boqAADAM2ru0Ff9iRxmuMWioQS8HrPdsKwvPjzGB76/Ktf3F7fz5boAAABb1PyB1XLjMYPlFstG2dYSvXol60sMlXjfbVfl+/9YC/81fV6+EJp2mWCWH4mVU1Mn4oN5xJcY0Hj5m2vyRx3tfHRCzfOyJTJlqWTqm+OlVOtE+cuCIAbS/obDKiOtv6bQ969atjUuN+ZT4bNbRcvc1lBOnc/iGp2m4hImw5KML9FtsWL7uny/K1PNUzFuI8Nz0dYwNpRtcWXkIsnS63KNqcaKRkaO7Uay0b4unR4bjzbHdWh+FYAb9k/eGNIL7WFjLDaebZ+OvBAcLQiB57mx4e+sA3D9aLJPw5Nn45P+5q9Lln5Pg5qdgir/I9EVCCDISNE+lRU61peST4x3+55NTn4faGoTMH4moWbbeGx6ctKJzvBWRop2EU5Yd33h2PtexODp7HAzTJNYubwxYCqXR43iuA5JBc6fyfP+nTkldNOt0GNrJXMtqIvp+Sa5YbWEzXsTem4WW+MjcCzEQEoIHzEZ7icblPRzNW3MBnUhAADAw4HGBsm0nptkFBf6La0mB+4pjFDOCKE3yyz62s2ltO0l5LWkbgQAOPFxZ5MQ+4Uf6zfGzbGzqvjS9zG/CNJc4JjGCI/cqI/8ys1zP6ulrgQ4ye/4xDwJzE0NZvF8gZh8Nb40xJlpLtitI2H9d/Xj/3ErRreoSwEAAB4F4IGP3u/D+tqEVXJ8JCYBgFHWlywy0vZhI3tzB8Cpz032iLoV4CQPcdElPJCHGq3i53li2Zqu6ojFKTZwUAf2Wzeb2T21jrEa6l4AAIBHYbLPYkubQkT/8iSsnHK6OsLI6SISd6asyLc7oM/Fc4trw4QQ4CQPsuG1MrF+3YBLM9mPPUctQJBkfH064n9wi5Xb5lGIjplQAgAA3AuTWmTW2NKElQUyMUUAAAWxeorxHShZ4pofQ2bI6xidUJMvYrXk76AUFhH9SZPxNVuAppYRX0oj8YlRPHb1nVAueB3fGcX9ELzyN+C/1Os4KBQKhUKhUCgUCoVCoVAoFDv8F6pOyz8OCDukAAAAAElFTkSuQmCC\"/>\n                </defs>\n                </svg>\n            ";
        }
    };
    /// Получение текста кнопки 
    Input.prototype.GetFavoriteButtonText = function (isFavorite) {
        return isFavorite ? ' В избранном' : ' В избранное';
    };
    /// Ответ на комментарий
    Input.prototype.BuildReplyCommentHtml = function (comment, parentAuthor) {
        var ratingClass = comment.hasVotedUp ? 'voted-up' : comment.hasVotedDown ? 'voted-down' : '';
        if (isDesktop()) {
            return "\n            <div class=\"comment-block lvl-2-nesting\" data-comment-id=\"".concat(comment.id, "\">\n                <img class=\"avatar\" src=\"").concat(this.EscapeHtml(comment.avatarSrc), "\" width=\"61\" height=\"61\">\n                <div class=\"input-container\">\n                    <div class=\"comment-information-container\">\n                        <h3 class=\"name-commentator\">").concat(this.EscapeHtml(comment.name), "</h3>\n                        <div class=\"name-answer\">\n                            <svg width=\"22\" height=\"22\" viewBox=\"0 0 22 22\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n                                <g opacity=\"0.4\">\n                                <mask id=\"mask0_3_259\" style=\"mask-type:alpha\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"22\" height=\"22\">\n                                <rect width=\"22\" height=\"22\" fill=\"url(#pattern0_3_259)\"/>\n                                </mask>\n                                <g mask=\"url(#mask0_3_259)\">\n                                <rect x=\"-2\" y=\"-1\" width=\"26\" height=\"25\" fill=\"black\"/>\n                                </g>\n                                </g>\n                                <defs>\n                                <pattern id=\"pattern0_3_259\" patternContentUnits=\"objectBoundingBox\" width=\"1\" height=\"1\">\n                                <use xlink:href=\"#image0_3_259\" transform=\"scale(0.01)\"/>\n                                </pattern>\n                                <image id=\"image0_3_259\" width=\"100\" height=\"100\" preserveAspectRatio=\"none\" xlink:href=\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAAEvElEQVR4nO2cW4hVVRiAvzONFOOMRWMD6aA1E4OJBVEveQHD7KGHSKiHoKIQAiPQCOshovAlXyL0pZdQH9QuFEQWEdHV7lEYJVFmiZYYRNNNytIzPfxn8njmXNZeZ+3173X2/8HPzJlhzvnX/82+rfXvDYZhGIZhGIZhFIz12gkYwhDwNDClnYgBVwAHEBkmRJnbgeOclmFClBgEdnGmCBOixCLgC5rLMCGRuQ34k9YyTEgkzgG20F6ECYnEBLAPNxkmJGfWAJO4yzAhOXE27rsoE5IzC4AP8JNhQgJzA/AL/jJMSCD6gc1Ale5kmJAAjALv0r0IExKAVcAxwskwIZ6cBTwCnCKsDBPiwQjwGuFFmBAPVgJHyU+GCXGkAjwAnCRfGSbEgbnAK+QvohRCKl3+/QrgKWB+gFxc+R34rRa/1n1/DPi2Lg4jJxWloALcD/xLvC0ja5wAvgJ2AncDlwF9eRRDm/OBPegX3CcmgZeBjcDFoQujwZXAQfQLGyr2I9dLl4QsUizWI7sB7SLmEVVgL3ATclFbaOqb1MoQ3yH/fLNDFC80jU1qZYqfgQeR9f5C0KxJrYxxpFYLNdo1qZU5XgeWdFFXL5Yg5+7agy9qnADupfsLaidcmtQsJF4Ehv3K3JksTWoWp+MIsNyj3m3pQza/wdBvXAJGgTfJ8YBvuyy/qAL3edTbiU6d5xatY7NHvZ2w017/2OJRb2fswtAvHvIptitlnjrxjSpwh0+xXRkCninAQFOKf4DrfIqdhbvo3en3PGKSCItgVyHT09qDTSU+AmZ5VToD5wLPKQ80pXjUr8zZmO7DKnKTQ1HiFNLjHIUVwA85D6gX4gCOC10hppFHkFab1QHey4UBZHBzkP3zeUiz3gW1uBBYCIwB47XfF4FNwMOxPqyv9mFFbCUdBq5B1jF2AF8S5sahrPE3csdxVFYBP3WZeGghzRhGbq97DGkFiiXlpUD5Z2Ie8LZHsjGFNDKOdJq8R/5bz9KcxtCWfuR0L4/B5c04svs9nEPuU8AbEcbQkuuRdpqUhEzTjzTO7Q2c/xQRT4ObMYrsClITUs8ywvYzvxo3/ZnMAh4n/duiryXMAl4VWBw596asQe7pSFUIyK7sHuQ+lW7G8UTsxFsxDnxKukKmWYjsenzHcRyZFywEvfLwmQrd3RWwNn7K7bkF+IN0hUxzNX4PSHhLI9lOTACfk7YQkMWor8l+cC/knVwDwHbSFgIy0foJ2aRsVMnUkTvp3OlSdAaRTnlXIe/opOnOpciMbKpCQBpDPsNNyElk+aDQDAG7SVcIyLrMIdyk3KqUY2bWIesIKQoB2dpdnqC3TStBH1J/GP+NdBZyUC07T+YAz5KmEIAn6SxlgVp2nlSADdpJeDJI55bcm9WyKykraS9kk15q5eV5Wgt5QTGv0jLGzLPGZA/svcJWWs9rDSnmVVouonUL7tKefKBXwTmEHEuaMWFCdNja4ufzTYgO7wPfNPn5vMI/rKuHmYtcm9RzVCMRQ7icmQf1j1UzKjkV4EfOFPK9HUP0mEJWFuuZbUJ0+bDh9YAJ0WVfw+sBlSyM/xmh4cAe5VF1RlvGal//QiYeDcMwDMMwDMMwDMMwjOb8B7T5oNqqo7gkAAAAAElFTkSuQmCC\"/>\n                                </defs>\n                            </svg>\n                            <h3 class=\"buttons-comment answer\">").concat(this.EscapeHtml(parentAuthor), "</h3>\n                        </div>\n                        <h5 class=\"comment-date-time\">").concat(this.EscapeHtml(comment.date), "</h5>\n                    </div>\n                    <p class=\"comment-text\">").concat(this.EscapeHtml(comment.text), "</p>\n                    <div class=\"buttons-comment-block\">\n                        <div class=\"favorites-container\">\n                            <button class=\"buttons-comment add-favorites\">\n                                ").concat(this.GetFavoriteIconSvg(comment.isFavorite), "\n                                <span class=\"favorites-text\">").concat(this.GetFavoriteButtonText(comment.isFavorite), "</span>\n                            </button>\n                        </div>\n                        <div class=\"rating-comment-container\">\n                            <button class=\"buttons-comment rating-button demotion\" data-action=\"down\">\n                                <svg width=\"20\" height=\"23\" viewBox=\"0 0 20 23\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                                    <circle opacity=\"0.1\" cx=\"10\" cy=\"13\" r=\"10\" fill=\"black\"/>\n                                    <path d=\"M13.0696 11.6399V13.2955H7.26562V11.6399H13.0696Z\" fill=\"#FF0000\"/>\n                                </svg>\n                            </button>\n                            <p class=\"rating-count ").concat(ratingClass, "\">").concat(comment.rating, "</p>\n                            <button class=\"buttons-comment rating-button increase\" data-action=\"up\">\n                                <svg width=\"20\" height=\"23\" viewBox=\"0 0 20 23\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                                    <circle opacity=\"0.1\" cx=\"10\" cy=\"13\" r=\"10\" fill=\"black\"/>\n                                    <path d=\"M9.13281 17.169V8.52699H10.8523V17.169H9.13281ZM5.67472 13.7045V11.9851H14.3168V13.7045H5.67472Z\" fill=\"#8AC540\"/>\n                                </svg>\n                            </button>\n                        </div>\n                    </div>\n                </div>\n            </div>");
        }
        else {
            return "\n            <div class=\"comment-block lvl-2-nesting\" data-comment-id=\"".concat(comment.id, "\">\n                \n                <div class=\"input-container\">\n                    <div class=\"comment-information-container\">\n                        <img class=\"avatar\" src=\"").concat(this.EscapeHtml(comment.avatarSrc), "\" width=\"61\" height=\"61\">\n                        <h3 class=\"name-commentator\">").concat(this.EscapeHtml(comment.name), "</h3>\n                        \n                        <h5 class=\"comment-date-time\">").concat(this.EscapeHtml(comment.date), "</h5>\n                    </div>\n                    <div class=\"name-answer\">\n                            <svg width=\"22\" height=\"22\" viewBox=\"0 0 22 22\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n                                <g opacity=\"0.4\">\n                                <mask id=\"mask0_3_259\" style=\"mask-type:alpha\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"22\" height=\"22\">\n                                <rect width=\"22\" height=\"22\" fill=\"url(#pattern0_3_259)\"/>\n                                </mask>\n                                <g mask=\"url(#mask0_3_259)\">\n                                <rect x=\"-2\" y=\"-1\" width=\"26\" height=\"25\" fill=\"black\"/>\n                                </g>\n                                </g>\n                                <defs>\n                                <pattern id=\"pattern0_3_259\" patternContentUnits=\"objectBoundingBox\" width=\"1\" height=\"1\">\n                                <use xlink:href=\"#image0_3_259\" transform=\"scale(0.01)\"/>\n                                </pattern>\n                                <image id=\"image0_3_259\" width=\"100\" height=\"100\" preserveAspectRatio=\"none\" xlink:href=\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAAEvElEQVR4nO2cW4hVVRiAvzONFOOMRWMD6aA1E4OJBVEveQHD7KGHSKiHoKIQAiPQCOshovAlXyL0pZdQH9QuFEQWEdHV7lEYJVFmiZYYRNNNytIzPfxn8njmXNZeZ+3173X2/8HPzJlhzvnX/82+rfXvDYZhGIZhGIZhFIz12gkYwhDwNDClnYgBVwAHEBkmRJnbgeOclmFClBgEdnGmCBOixCLgC5rLMCGRuQ34k9YyTEgkzgG20F6ECYnEBLAPNxkmJGfWAJO4yzAhOXE27rsoE5IzC4AP8JNhQgJzA/AL/jJMSCD6gc1Ale5kmJAAjALv0r0IExKAVcAxwskwIZ6cBTwCnCKsDBPiwQjwGuFFmBAPVgJHyU+GCXGkAjwAnCRfGSbEgbnAK+QvohRCKl3+/QrgKWB+gFxc+R34rRa/1n1/DPi2Lg4jJxWloALcD/xLvC0ja5wAvgJ2AncDlwF9eRRDm/OBPegX3CcmgZeBjcDFoQujwZXAQfQLGyr2I9dLl4QsUizWI7sB7SLmEVVgL3ATclFbaOqb1MoQ3yH/fLNDFC80jU1qZYqfgQeR9f5C0KxJrYxxpFYLNdo1qZU5XgeWdFFXL5Yg5+7agy9qnADupfsLaidcmtQsJF4Ehv3K3JksTWoWp+MIsNyj3m3pQza/wdBvXAJGgTfJ8YBvuyy/qAL3edTbiU6d5xatY7NHvZ2w017/2OJRb2fswtAvHvIptitlnjrxjSpwh0+xXRkCninAQFOKf4DrfIqdhbvo3en3PGKSCItgVyHT09qDTSU+AmZ5VToD5wLPKQ80pXjUr8zZmO7DKnKTQ1HiFNLjHIUVwA85D6gX4gCOC10hppFHkFab1QHey4UBZHBzkP3zeUiz3gW1uBBYCIwB47XfF4FNwMOxPqyv9mFFbCUdBq5B1jF2AF8S5sahrPE3csdxVFYBP3WZeGghzRhGbq97DGkFiiXlpUD5Z2Ie8LZHsjGFNDKOdJq8R/5bz9KcxtCWfuR0L4/B5c04svs9nEPuU8AbEcbQkuuRdpqUhEzTjzTO7Q2c/xQRT4ObMYrsClITUs8ywvYzvxo3/ZnMAh4n/duiryXMAl4VWBw596asQe7pSFUIyK7sHuQ+lW7G8UTsxFsxDnxKukKmWYjsenzHcRyZFywEvfLwmQrd3RWwNn7K7bkF+IN0hUxzNX4PSHhLI9lOTACfk7YQkMWor8l+cC/knVwDwHbSFgIy0foJ2aRsVMnUkTvp3OlSdAaRTnlXIe/opOnOpciMbKpCQBpDPsNNyElk+aDQDAG7SVcIyLrMIdyk3KqUY2bWIesIKQoB2dpdnqC3TStBH1J/GP+NdBZyUC07T+YAz5KmEIAn6SxlgVp2nlSADdpJeDJI55bcm9WyKykraS9kk15q5eV5Wgt5QTGv0jLGzLPGZA/svcJWWs9rDSnmVVouonUL7tKefKBXwTmEHEuaMWFCdNja4ufzTYgO7wPfNPn5vMI/rKuHmYtcm9RzVCMRQ7icmQf1j1UzKjkV4EfOFPK9HUP0mEJWFuuZbUJ0+bDh9YAJ0WVfw+sBlSyM/xmh4cAe5VF1RlvGal//QiYeDcMwDMMwDMMwDMMwjOb8B7T5oNqqo7gkAAAAAElFTkSuQmCC\"/>\n                                </defs>\n                            </svg>\n                            <h3 class=\"buttons-comment answer\">").concat(this.EscapeHtml(parentAuthor), "</h3>\n                        </div>\n                    <p class=\"comment-text\">").concat(this.EscapeHtml(comment.text), "</p>\n                    <div class=\"buttons-comment-block\">\n                        <div class=\"favorites-container\">\n                            <button class=\"buttons-comment add-favorites\">\n                                ").concat(this.GetFavoriteIconSvg(comment.isFavorite), "\n                                <span class=\"favorites-text\">").concat(this.GetFavoriteButtonText(comment.isFavorite), "</span>\n                            </button>\n                        </div>\n                        <div class=\"rating-comment-container\">\n                            <button class=\"buttons-comment rating-button demotion\" data-action=\"down\">\n                                <svg width=\"20\" height=\"23\" viewBox=\"0 0 20 23\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                                    <circle opacity=\"0.1\" cx=\"10\" cy=\"13\" r=\"10\" fill=\"black\"/>\n                                    <path d=\"M13.0696 11.6399V13.2955H7.26562V11.6399H13.0696Z\" fill=\"#FF0000\"/>\n                                </svg>\n                            </button>\n                            <p class=\"rating-count ").concat(ratingClass, "\">").concat(comment.rating, "</p>\n                            <button class=\"buttons-comment rating-button increase\" data-action=\"up\">\n                                <svg width=\"20\" height=\"23\" viewBox=\"0 0 20 23\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                                    <circle opacity=\"0.1\" cx=\"10\" cy=\"13\" r=\"10\" fill=\"black\"/>\n                                    <path d=\"M9.13281 17.169V8.52699H10.8523V17.169H9.13281ZM5.67472 13.7045V11.9851H14.3168V13.7045H5.67472Z\" fill=\"#8AC540\"/>\n                                </svg>\n                            </button>\n                        </div>\n                    </div>\n                </div>\n            </div>");
        }
    };
    /// Добавить комментарий
    Input.prototype.AppendCommentToDOM = function (comment) {
        var _a;
        var html = '';
        if (comment.parentId) {
            var targetAuthor = 'Автор';
            html = this.BuildReplyCommentHtml(comment, targetAuthor);
        }
        else {
            html = this.BuildRootCommentHtml(comment);
        }
        (_a = this.commentsContainer) === null || _a === void 0 ? void 0 : _a.insertAdjacentHTML('beforeend', html);
    };
    Input.prototype.EscapeHtml = function (text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };
    /// Загрузка комментариев из хранилища
    Input.prototype.LoadCommentsFromStorage = function () {
        var _this = this;
        var scrollY = window.scrollY;
        var openReplyParentId = this.replyToId;
        var openReplyDraft = this.replyDraftText;
        var comments = this.GetSavedComments();
        if (!this.commentsContainer)
            return;
        var dynamicComments = this.commentsContainer.querySelectorAll('.comment-block:not(.reply-input-container)');
        dynamicComments.forEach(function (el) { return el.remove(); });
        // Разделить на корневые и ответы
        var roots = [];
        var replies = [];
        comments.forEach(function (comment) {
            if (comment.parentId) {
                replies.push(comment);
            }
            else {
                roots.push(comment);
            }
        });
        // Сначала добавить корневые
        roots.forEach(function (comment) {
            _this.AppendCommentToDOM(comment);
        });
        // Потом ответы
        replies.forEach(function (reply) {
            var parentEl = _this.commentsContainer.querySelector("[data-comment-id=\"".concat(reply.parentId, "\"]"));
            if (parentEl) {
                var insertAfter = parentEl;
                var next = insertAfter.nextElementSibling;
                while (next && next instanceof HTMLElement && next.classList.contains('lvl-2-nesting')) {
                    insertAfter = next;
                    next = next.nextElementSibling;
                }
                insertAfter.insertAdjacentHTML('afterend', _this.BuildReplyCommentHtml(reply, reply.parentAuthor || 'Автор'));
            }
            else {
                _this.commentsContainer.insertAdjacentHTML('beforeend', _this.BuildReplyCommentHtml(reply, reply.parentAuthor || 'Автор'));
            }
        });
        this.ApplyFilter();
        if (openReplyParentId) {
            var parentEl = this.commentsContainer.querySelector("[data-comment-id=\"".concat(openReplyParentId, "\"]"));
            if (parentEl) {
                this.replyToId = openReplyParentId;
                this.replyDraftText = openReplyDraft;
                this.ShowReplyBox(parentEl);
            }
            else {
                this.replyToId = null;
                this.replyDraftText = '';
            }
        }
        GetCountComments();
        setTimeout(function () {
            window.scrollTo(0, scrollY);
        }, 0);
    };
    /// Инициализация кнопки
    Input.prototype.SetSendButton = function (button) {
        this.sendButton = button;
    };
    /// Триггер, когда печатается текст
    Input.prototype.TypingText = function () {
        if (this.inputElement && this.sendButton) {
            var textarea = this.inputElement;
            var wrapper = textarea.parentElement;
            if (!wrapper)
                return;
            var isText = textarea.value.trim().length > 0;
            textarea.style.height = 'auto';
            var scrollHeight = textarea.scrollHeight;
            var maxHeight = 225;
            var newHeight = scrollHeight;
            if (newHeight < 61)
                newHeight = 61;
            if (newHeight > maxHeight) {
                newHeight = maxHeight;
                textarea.classList.add('growing');
            }
            else {
                textarea.classList.remove('growing');
            }
            wrapper.style.height = newHeight + 'px';
            textarea.style.height = '100%';
            this.sendButton.ChangeStateButton(isText);
            this.CountLenghtSymbols();
        }
    };
    /// Счётчик длины введённого текста
    Input.prototype.CountLenghtSymbols = function () {
        if (this.restrictionsElement && this.inputElement && this.sendButton) {
            this.countSymbols = this.inputElement.value.length;
            //this.sendButton.ChangeStateButton(true);
            if (this.countSymbols <= 0) {
                this.restrictionsElement.textContent = "\u041C\u0430\u043A\u0441. 1000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432";
                this.restrictionsElement.style.color = "#999999";
                this.WarningActive(false);
            }
            else if (this.countSymbols > 1000) {
                this.restrictionsElement.style.color = "red";
                this.restrictionsElement.textContent = "".concat(this.countSymbols, "/1000");
                this.sendButton.ChangeStateButton(false);
                this.WarningActive(true);
            }
            else {
                this.restrictionsElement.textContent = "".concat(this.countSymbols, "/1000");
                this.restrictionsElement.style.color = "#999999";
                this.WarningActive(false);
            }
        }
    };
    /// Настройка стиля для текста предупреждения
    Input.prototype.WarningActive = function (param) {
        var warningText = document.querySelector(".limit-count");
        if (this.sendButton && this.sendButton.sendButton && warningText) {
            if (param) {
                warningText.style.display = "block";
                if (isDesktop())
                    this.sendButton.sendButton.style.margin = "26px 0 auto 0";
                else
                    this.sendButton.sendButton.style.margin = "0";
            }
            else {
                warningText.style.display = "none";
                if (isDesktop())
                    this.sendButton.sendButton.style.margin = "40px 0 auto 0";
                else
                    this.sendButton.sendButton.style.margin = "0";
            }
        }
    };
    /// Сброс после отправки
    Input.prototype.OnReset = function () {
        if (this.inputElement) {
            this.inputElement.value = '';
        }
        this.CountLenghtSymbols();
        if (this.inputElement) {
            var textarea = this.inputElement;
            var wrapper = textarea.parentElement;
            if (wrapper)
                wrapper.style.height = "61px";
        }
    };
    /// Показ поля для ответа
    Input.prototype.ShowReplyBox = function (parentComment) {
        var _this = this;
        var _a, _b;
        var parentId = parentComment.dataset.commentId;
        var existing = (_a = this.commentsContainer) === null || _a === void 0 ? void 0 : _a.querySelector(".reply-input-container[data-parent-id=\"".concat(parentId, "\"]"));
        if (existing) {
            var textarea_1 = existing.querySelector('textarea');
            textarea_1 === null || textarea_1 === void 0 ? void 0 : textarea_1.focus();
            return;
        }
        if (!parentId) {
            alert('Ошибка: нельзя ответить на этот комментарий.');
            return;
        }
        var targetAuthor = ((_b = parentComment.querySelector('.name-commentator')) === null || _b === void 0 ? void 0 : _b.textContent) || 'Автор';
        var replyHtml = "";
        if (isDesktop()) {
            replyHtml = "\n                <div class=\"comment-block lvl-2-nesting reply-input-container\" data-parent-id=\"".concat(parentId, "\">\n                    <img class=\"avatar\" id=\"my-avatar\" src=\"../images/KorbenDetka.png\" width=\"61\" height=\"61\">    \n                    <div class=\"input-container\">\n                        <div class=\"input-information-container\">\n                            <h3 id=\"my-name\" class=\"name-commentator\">\u0418\u043B\u044C\u044F \u0412\u0430\u0441\u0438\u043B\u044C\u0435\u0432\u0438\u0447</h3>\n                            <div class=\"name-answer\">\n                                <svg width=\"22\" height=\"22\" viewBox=\"0 0 22 22\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n                                    <g opacity=\"0.4\">\n                                        <mask id=\"mask0_3_259\" style=\"mask-type:alpha\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"22\" height=\"22\">\n                                            <rect width=\"22\" height=\"22\" fill=\"url(#pattern0_3_259)\"/>\n                                        </mask>\n                                        <g mask=\"url(#mask0_3_259)\">\n                                            <rect x=\"-2\" y=\"-1\" width=\"26\" height=\"25\" fill=\"black\"/>\n                                        </g>\n                                    </g>\n                                    <defs>\n                                        <pattern id=\"pattern0_3_259\" patternContentUnits=\"objectBoundingBox\" width=\"1\" height=\"1\">\n                                            <use xlink:href=\"#image0_3_259\" transform=\"scale(0.01)\"/>\n                                        </pattern>\n                                        <image id=\"image0_3_259\" width=\"100\" height=\"100\" preserveAspectRatio=\"none\" xlink:href=\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAAEvElEQVR4nO2cW4hVVRiAvzONFOOMRWMD6aA1E4OJBVEveQHD7KGHSKiHoKIQAiPQCOshovAlXyL0pZdQH9QuFEQWEdHV7lEYJVFmiZYYRNNNytIzPfxn8njmXNZeZ+3173X2/8HPzJlhzvnX/82+rfXvDYZhGIZhGIZhFIz12gkYwhDwNDClnYgBVwAHEBkmRJnbgeOclmFClBgEdnGmCBOixCLgC5rLMCGRuQ34k9YyTEgkzgG20F6ECYnEBLAPNxkmJGfWAJO4yzAhOXE27rsoE5IzC4AP8JNhQgJzA/AL/jJMSCD6gc1Ale5kmJAAjALv0r0IExKAVcAxwskwIZ6cBTwCnCKsDBPiwQjwGuFFmBAPVgJHyU+GCXGkAjwAnCRfGSbEgbnAK+QvohRCKl3+/QrgKWB+gFxc+R34rRa/1n1/DPi2Lg4jJxWloALcD/xLvC0ja5wAvgJ2AncDlwF9eRRDm/OBPegX3CcmgZeBjcDFoQujwZXAQfQLGyr2I9dLl4QsUizWI7sB7SLmEVVgL3ATclFbaOqb1MoQ3yH/fLNDFC80jU1qZYqfgQeR9f5C0KxJrYxxpFYLNdo1qZU5XgeWdFFXL5Yg5+7agy9qnADupfsLaidcmtQsJF4Ehv3K3JksTWoWp+MIsNyj3m3pQza/wdBvXAJGgTfJ8YBvuyy/qAL3edTbiU6d5xatY7NHvZ2w017/2OJRb2fswtAvHvIptitlnjrxjSpwh0+xXRkCninAQFOKf4DrfIqdhbvo3en3PGKSCItgVyHT09qDTSU+AmZ5VToD5wLPKQ80pXjUr8zZmO7DKnKTQ1HiFNLjHIUVwA85D6gX4gCOC10hppFHkFab1QHey4UBZHBzkP3zeUiz3gW1uBBYCIwB47XfF4FNwMOxPqyv9mFFbCUdBq5B1jF2AF8S5sahrPE3csdxVFYBP3WZeGghzRhGbq97DGkFiiXlpUD5Z2Ie8LZHsjGFNDKOdJq8R/5bz9KcxtCWfuR0L4/B5c04svs9nEPuU8AbEcbQkuuRdpqUhEzTjzTO7Q2c/xQRT4ObMYrsClITUs8ywvYzvxo3/ZnMAh4n/duiryXMAl4VWBw596asQe7pSFUIyK7sHuQ+lW7G8UTsxFsxDnxKukKmWYjsenzHcRyZFywEvfLwmQrd3RWwNn7K7bkF+IN0hUxzNX4PSHhLI9lOTACfk7YQkMWor8l+cC/knVwDwHbSFgIy0foJ2aRsVMnUkTvp3OlSdAaRTnlXIe/opOnOpciMbKpCQBpDPsNNyElk+aDQDAG7SVcIyLrMIdyk3KqUY2bWIesIKQoB2dpdnqC3TStBH1J/GP+NdBZyUC07T+YAz5KmEIAn6SxlgVp2nlSADdpJeDJI55bcm9WyKykraS9kk15q5eV5Wgt5QTGv0jLGzLPGZA/svcJWWs9rDSnmVVouonUL7tKefKBXwTmEHEuaMWFCdNja4ufzTYgO7wPfNPn5vMI/rKuHmYtcm9RzVCMRQ7icmQf1j1UzKjkV4EfOFPK9HUP0mEJWFuuZbUJ0+bDh9YAJ0WVfw+sBlSyM/xmh4cAe5VF1RlvGal//QiYeDcMwDMMwDMMwDMMwjOb8B7T5oNqqo7gkAAAAAElFTkSuQmCC\"/>\n                                    </defs>\n                                </svg>\n                                <h3 class=\"buttons-comment answer\">").concat(this.EscapeHtml(targetAuthor), "</h3>\n                            </div>\n                            <h5 class=\"restrictions\">\u041C\u0430\u043A\u0441. 1000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432</h5>\n                        </div>\n                        <div class=\"textarea-wrapper\">\n                            <textarea class=\"input-comments\" rows=\"1\" placeholder=\"\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0442\u0435\u043A\u0441\u0442 \u043E\u0442\u0432\u0435\u0442\u0430...\"></textarea>\n                        </div>\n                    </div>\n                    <div class=\"button-container\">\n                        <h5 class=\"limit-count\">\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u043E\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435</h5>\n                        <button class=\"send-comments\" disabled>\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u043E\u0442\u0432\u0435\u0442</button>\n                    </div>\n                </div>\n            ");
        }
        else {
            replyHtml = "\n                <div class=\"comment-block lvl-2-nesting reply-input-container\" data-parent-id=\"".concat(parentId, "\">   \n                    <div class=\"input-container\">\n                        <div class=\"input-information-container\">\n                            <img class=\"avatar\" id=\"my-avatar\" src=\"../images/KorbenDetka.png\" width=\"61\" height=\"61\">\n                            <h3 id=\"my-name\" class=\"name-commentator\">\u0418\u043B\u044C\u044F \u0412\u0430\u0441\u0438\u043B\u044C\u0435\u0432\u0438\u0447</h3>\n                            <div class=\"name-answer\">\n                                <svg width=\"22\" height=\"22\" viewBox=\"0 0 22 22\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n                                    <g opacity=\"0.4\">\n                                        <mask id=\"mask0_3_259\" style=\"mask-type:alpha\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"22\" height=\"22\">\n                                            <rect width=\"22\" height=\"22\" fill=\"url(#pattern0_3_259)\"/>\n                                        </mask>\n                                        <g mask=\"url(#mask0_3_259)\">\n                                            <rect x=\"-2\" y=\"-1\" width=\"26\" height=\"25\" fill=\"black\"/>\n                                        </g>\n                                    </g>\n                                    <defs>\n                                        <pattern id=\"pattern0_3_259\" patternContentUnits=\"objectBoundingBox\" width=\"1\" height=\"1\">\n                                            <use xlink:href=\"#image0_3_259\" transform=\"scale(0.01)\"/>\n                                        </pattern>\n                                        <image id=\"image0_3_259\" width=\"100\" height=\"100\" preserveAspectRatio=\"none\" xlink:href=\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAAEvElEQVR4nO2cW4hVVRiAvzONFOOMRWMD6aA1E4OJBVEveQHD7KGHSKiHoKIQAiPQCOshovAlXyL0pZdQH9QuFEQWEdHV7lEYJVFmiZYYRNNNytIzPfxn8njmXNZeZ+3173X2/8HPzJlhzvnX/82+rfXvDYZhGIZhGIZhFIz12gkYwhDwNDClnYgBVwAHEBkmRJnbgeOclmFClBgEdnGmCBOixCLgC5rLMCGRuQ34k9YyTEgkzgG20F6ECYnEBLAPNxkmJGfWAJO4yzAhOXE27rsoE5IzC4AP8JNhQgJzA/AL/jJMSCD6gc1Ale5kmJAAjALv0r0IExKAVcAxwskwIZ6cBTwCnCKsDBPiwQjwGuFFmBAPVgJHyU+GCXGkAjwAnCRfGSbEgbnAK+QvohRCKl3+/QrgKWB+gFxc+R34rRa/1n1/DPi2Lg4jJxWloALcD/xLvC0ja5wAvgJ2AncDlwF9eRRDm/OBPegX3CcmgZeBjcDFoQujwZXAQfQLGyr2I9dLl4QsUizWI7sB7SLmEVVgL3ATclFbaOqb1MoQ3yH/fLNDFC80jU1qZYqfgQeR9f5C0KxJrYxxpFYLNdo1qZU5XgeWdFFXL5Yg5+7agy9qnADupfsLaidcmtQsJF4Ehv3K3JksTWoWp+MIsNyj3m3pQza/wdBvXAJGgTfJ8YBvuyy/qAL3edTbiU6d5xatY7NHvZ2w017/2OJRb2fswtAvHvIptitlnjrxjSpwh0+xXRkCninAQFOKf4DrfIqdhbvo3en3PGKSCItgVyHT09qDTSU+AmZ5VToD5wLPKQ80pXjUr8zZmO7DKnKTQ1HiFNLjHIUVwA85D6gX4gCOC10hppFHkFab1QHey4UBZHBzkP3zeUiz3gW1uBBYCIwB47XfF4FNwMOxPqyv9mFFbCUdBq5B1jF2AF8S5sahrPE3csdxVFYBP3WZeGghzRhGbq97DGkFiiXlpUD5Z2Ie8LZHsjGFNDKOdJq8R/5bz9KcxtCWfuR0L4/B5c04svs9nEPuU8AbEcbQkuuRdpqUhEzTjzTO7Q2c/xQRT4ObMYrsClITUs8ywvYzvxo3/ZnMAh4n/duiryXMAl4VWBw596asQe7pSFUIyK7sHuQ+lW7G8UTsxFsxDnxKukKmWYjsenzHcRyZFywEvfLwmQrd3RWwNn7K7bkF+IN0hUxzNX4PSHhLI9lOTACfk7YQkMWor8l+cC/knVwDwHbSFgIy0foJ2aRsVMnUkTvp3OlSdAaRTnlXIe/opOnOpciMbKpCQBpDPsNNyElk+aDQDAG7SVcIyLrMIdyk3KqUY2bWIesIKQoB2dpdnqC3TStBH1J/GP+NdBZyUC07T+YAz5KmEIAn6SxlgVp2nlSADdpJeDJI55bcm9WyKykraS9kk15q5eV5Wgt5QTGv0jLGzLPGZA/svcJWWs9rDSnmVVouonUL7tKefKBXwTmEHEuaMWFCdNja4ufzTYgO7wPfNPn5vMI/rKuHmYtcm9RzVCMRQ7icmQf1j1UzKjkV4EfOFPK9HUP0mEJWFuuZbUJ0+bDh9YAJ0WVfw+sBlSyM/xmh4cAe5VF1RlvGal//QiYeDcMwDMMwDMMwDMMwjOb8B7T5oNqqo7gkAAAAAElFTkSuQmCC\"/>\n                                    </defs>\n                                </svg>\n                                <h3 class=\"buttons-comment answer\">").concat(this.EscapeHtml(targetAuthor), "</h3>\n                            </div>\n                            \n                        </div>\n                        <h5 class=\"restrictions\">\u041C\u0430\u043A\u0441. 1000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432</h5>\n                        <div class=\"textarea-wrapper\">\n                            <textarea class=\"input-comments\" rows=\"1\" placeholder=\"\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0442\u0435\u043A\u0441\u0442 \u043E\u0442\u0432\u0435\u0442\u0430...\"></textarea>\n                        </div>\n                    </div>\n                    <div class=\"button-container\">\n                        <h5 class=\"limit-count\">\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u043E\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435</h5>\n                        <button class=\"send-comments\" disabled>\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u043E\u0442\u0432\u0435\u0442</button>\n                    </div>\n                </div>\n            ");
        }
        var insertAfter = parentComment;
        var next = insertAfter.nextElementSibling;
        while (next && next instanceof HTMLElement && next.classList.contains('lvl-2-nesting')) {
            insertAfter = next;
            next = next.nextElementSibling;
        }
        insertAfter.insertAdjacentHTML('afterend', replyHtml);
        // Настройка поведения
        var newReplyBox = insertAfter.nextElementSibling;
        var textarea = newReplyBox.querySelector('textarea');
        var sendBtn = newReplyBox.querySelector('.send-comments');
        var restrictions = newReplyBox.querySelector('.restrictions');
        var limitCount = newReplyBox.querySelector('.limit-count');
        if (this.replyToId === parentId) {
            textarea.value = this.replyDraftText;
        }
        var updateUI = function () {
            var text = textarea.value;
            var len = text.length;
            var isValid = len > 0 && len <= 1000;
            // Обновление ограничений
            if (len === 0) {
                restrictions.textContent = 'Макс. 1000 символов';
                restrictions.style.color = '#999999';
                limitCount.style.display = 'none';
            }
            else if (len > 1000) {
                restrictions.textContent = "".concat(len, "/1000");
                restrictions.style.color = 'red';
                limitCount.style.display = 'block';
            }
            else {
                restrictions.textContent = "".concat(len, "/1000");
                restrictions.style.color = '#999999';
                limitCount.style.display = 'none';
            }
            // Обновление кнопки
            sendBtn.disabled = !isValid;
            sendBtn.classList.toggle('active', isValid);
            var wrapper = textarea.parentElement;
            if (!wrapper)
                return;
            textarea.style.height = 'auto';
            var scrollHeight = textarea.scrollHeight;
            var maxHeight = 225;
            var newHeight = scrollHeight;
            if (newHeight < 61)
                newHeight = 61;
            if (newHeight > maxHeight) {
                newHeight = maxHeight;
                textarea.classList.add('growing');
            }
            else {
                textarea.classList.remove('growing');
            }
            wrapper.style.height = newHeight + 'px';
            textarea.style.height = '100%';
            _this.replyDraftText = text;
        };
        if (this.replyToId === parentId) {
            textarea.value = this.replyDraftText;
            updateUI();
        }
        this.replyToId = parentId;
        textarea.addEventListener('input', function () {
            updateUI();
            _this.replyDraftText = textarea.value;
        });
        sendBtn.addEventListener('click', function (e) {
            e.preventDefault();
            var text = textarea.value.trim();
            if (text && text.length <= 1000) {
                _this.SendReply(parentComment, text, newReplyBox);
            }
        });
        textarea.focus();
    };
    /// Отправка ответа на комментарий
    Input.prototype.SendReply = function (parentComment, text, replyBox) {
        var _a, _b, _c, _d;
        var avatarElem = document.getElementById("my-avatar");
        var avatarSrc = (_a = avatarElem === null || avatarElem === void 0 ? void 0 : avatarElem.src) !== null && _a !== void 0 ? _a : '';
        var nameElem = document.getElementById("my-name");
        var name = (_b = nameElem === null || nameElem === void 0 ? void 0 : nameElem.textContent) !== null && _b !== void 0 ? _b : 'Аноним';
        var now = new Date();
        var date = "".concat(PadZero(now.getDate()), ".").concat(PadZero(now.getMonth() + 1), ".").concat(now.getFullYear(), " ").concat(PadZero(now.getHours()), ":").concat(PadZero(now.getMinutes()));
        var parentId = parentComment.dataset.commentId;
        var parentAuthor = ((_c = parentComment.querySelector('.name-commentator')) === null || _c === void 0 ? void 0 : _c.textContent) || 'Автор';
        var newComment = __assign(__assign(__assign({ id: GenerateId() }, (parentId && { parentId: parentId })), (parentAuthor && { parentAuthor: parentAuthor })), { avatarSrc: avatarSrc, name: name, text: text, date: date, rating: 0, hasVotedUp: false, hasVotedDown: false, isFavorite: false });
        var savedComments = this.GetSavedComments();
        savedComments.push(newComment);
        localStorage.setItem('comments', JSON.stringify(savedComments));
        var targetAuthor = ((_d = parentComment.querySelector('.name-commentator')) === null || _d === void 0 ? void 0 : _d.textContent) || 'Автор';
        var commentHtml = this.BuildReplyCommentHtml(newComment, targetAuthor);
        if (replyBox && replyBox.parentNode) {
            replyBox.insertAdjacentHTML('beforebegin', commentHtml);
            replyBox.remove();
        }
        else {
            var insertAfter = parentComment;
            var next = insertAfter.nextElementSibling;
            while (next && next instanceof HTMLElement && next.classList.contains('lvl-2-nesting')) {
                insertAfter = next;
                next = next.nextElementSibling;
            }
            insertAfter.insertAdjacentHTML('afterend', commentHtml);
        }
        GetCountComments();
        this.replyToId = null;
        this.replyDraftText = '';
    };
    /// Обработчик голосов
    Input.prototype.HandleVote = function (commentId, action) {
        var _a;
        var comments = this.GetSavedComments();
        var comment = undefined;
        // Поиск комментария
        for (var i = 0; i < comments.length; i++) {
            if (((_a = comments[i]) === null || _a === void 0 ? void 0 : _a.id) === commentId) {
                comment = comments[i];
                break;
            }
        }
        if (!comment)
            return;
        if (action === 'up') {
            if (comment.hasVotedUp) {
                // Уже голосовал ЗА - снимаем голос (возврат к 0)
                comment.rating -= 1;
                comment.hasVotedUp = false;
            }
            else if (comment.hasVotedDown) {
                // Голосовал ПРОТИВ - меняем на ЗА (+2)
                comment.rating += 2;
                comment.hasVotedDown = false;
                comment.hasVotedUp = true;
            }
            else {
                // Не голосовал - добавляем ЗА
                comment.rating += 1;
                comment.hasVotedUp = true;
            }
        }
        else {
            if (comment.hasVotedDown) {
                // Уже голосовал ПРОТИВ - снимаем голос (возврат к 0)
                comment.rating += 1;
                comment.hasVotedDown = false;
            }
            else if (comment.hasVotedUp) {
                // Голосовал ЗА - меняем на ПРОТИВ (-2)
                comment.rating -= 2;
                comment.hasVotedUp = false;
                comment.hasVotedDown = true;
            }
            else {
                // Не голосовал - добавляем ПРОТИВ
                comment.rating -= 1;
                comment.hasVotedDown = true;
            }
        }
        // Сохранение и обновление UI
        localStorage.setItem('comments', JSON.stringify(comments));
        this.UpdateCommentInDOM(commentId, comment);
    };
    /// Обновление комментариев
    Input.prototype.UpdateCommentInDOM = function (commentId, comment) {
        var el = document.querySelector(".comment-block[data-comment-id=\"".concat(commentId, "\"]"));
        if (!el)
            return;
        var ratingEl = el.querySelector('.rating-count');
        if (ratingEl) {
            ratingEl.textContent = String(comment.rating);
            ratingEl.className = 'rating-count';
            if (comment.hasVotedUp)
                ratingEl.classList.add('voted-up');
            if (comment.hasVotedDown)
                ratingEl.classList.add('voted-down');
        }
    };
    /// Избранное
    Input.prototype.ToggleFavorite = function (commentId) {
        var comments = this.GetSavedComments();
        var comment = undefined;
        for (var _i = 0, comments_1 = comments; _i < comments_1.length; _i++) {
            var c = comments_1[_i];
            if (c.id === commentId) {
                comment = c;
                break;
            }
        }
        if (!comment)
            return;
        comment.isFavorite = !comment.isFavorite;
        localStorage.setItem('comments', JSON.stringify(comments));
        this.UpdateFavoriteButtonInDOM(commentId, comment.isFavorite);
    };
    /// Обновить кнопку Избранное 
    Input.prototype.UpdateFavoriteButtonInDOM = function (commentId, isFavorite) {
        var block = document.querySelector(".comment-block[data-comment-id=\"".concat(commentId, "\"]"));
        if (!block)
            return;
        var button = block.querySelector('.add-favorites');
        if (!button)
            return;
        var svgContainer = button.querySelector('svg');
        var newSvg = this.GetFavoriteIconSvg(isFavorite);
        if (svgContainer && newSvg) {
            svgContainer.outerHTML = newSvg;
        }
        var textSpan = button.querySelector('.favorites-text');
        if (textSpan) {
            textSpan.textContent = this.GetFavoriteButtonText(isFavorite);
        }
    };
    /// Показ всех комментариев
    Input.prototype.ShowAllComments = function () {
        this.currentView = 'all';
        this.LoadCommentsFromStorage();
    };
    /// Показ избранных комментариев
    Input.prototype.ShowFavoriteComments = function () {
        var _this = this;
        this.currentView = 'favorites';
        var comments = this.GetSavedComments().filter(function (c) { return c.isFavorite; });
        if (!this.commentsContainer)
            return;
        var dynamicComments = this.commentsContainer.querySelectorAll('.comment-block');
        dynamicComments.forEach(function (el) { return el.remove(); });
        comments.forEach(function (comment) {
            var html = _this.BuildRootCommentHtml(__assign(__assign({}, comment), { parentId: undefined, parentAuthor: undefined }));
            _this.commentsContainer.insertAdjacentHTML('beforeend', html);
        });
    };
    /// Перестройка структуры формы ввода
    Input.prototype.RebuildInputForm = function () {
        var _this = this;
        var _a, _b, _c, _d, _e;
        var container = document.querySelector('.input-comments-container');
        if (!container)
            return;
        var currentText = ((_a = this.inputElement) === null || _a === void 0 ? void 0 : _a.value) || '';
        var isButtonActive = ((_c = (_b = this.sendButton) === null || _b === void 0 ? void 0 : _b.sendButton) === null || _c === void 0 ? void 0 : _c.classList.contains('active')) || false;
        var limitCountElement = document.querySelector('.limit-count');
        var isLimitVisible = (limitCountElement === null || limitCountElement === void 0 ? void 0 : limitCountElement.style.display) === 'block';
        var newHtml = '';
        if (isDesktop()) {
            newHtml = "\n            <img class=\"avatar\" id=\"my-avatar\" src=\"../images/KorbenDetka.png\" width=\"61\" height=\"61\">\n            <div class=\"input-container\">\n                <div class=\"input-information-container\">\n                    <h3 id=\"my-name\" class=\"name-commentator\">\u0418\u043B\u044C\u044F \u0412\u0430\u0441\u0438\u043B\u044C\u0435\u0432\u0438\u0447</h3>\n                    <h5 class=\"restrictions\">\u041C\u0430\u043A\u0441. 1000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432</h5>\n                </div>\n                <div class=\"textarea-wrapper\">\n                    <textarea id=\"input-comments\" rows=\"1\" placeholder=\"\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0442\u0435\u043A\u0441\u0442 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F...\">".concat(this.EscapeHtml(currentText), "</textarea>\n                </div>\n            </div>\n            <div class=\"button-container\">\n                <h5 class=\"limit-count\" style=\"display: ").concat(isLimitVisible ? 'block' : 'none', ";\">\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u043E\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435</h5>\n                <button class=\"send-comments ").concat(isButtonActive ? 'active' : '', "\" ").concat(isButtonActive ? '' : 'disabled', ">\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C</button>\n            </div>\n            ");
        }
        else {
            newHtml = "\n            <div class=\"img-name\">\n                <img class=\"avatar\" id=\"my-avatar\" src=\"../images/KorbenDetka.png\" width=\"61\" height=\"61\">\n                <h3 id=\"my-name\" class=\"name-commentator\">\u0418\u043B\u044C\u044F \u0412\u0430\u0441\u0438\u043B\u044C\u0435\u0432\u0438\u0447</h3>\n            </div>\n            <h5 class=\"restrictions\">\u041C\u0430\u043A\u0441. 1000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432</h5>\n            <div class=\"textarea-wrapper\">\n                <textarea id=\"input-comments\" rows=\"1\" placeholder=\"\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0442\u0435\u043A\u0441\u0442 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F...\">".concat(this.EscapeHtml(currentText), "</textarea>\n            </div>\n            <div class=\"button-container\">\n                <h5 class=\"limit-count\" style=\"display: ").concat(isLimitVisible ? 'block' : 'none', ";\">\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u043E\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435</h5>\n                <button class=\"send-comments ").concat(isButtonActive ? 'active' : '', "\" ").concat(isButtonActive ? '' : 'disabled', ">\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C</button>\n            </div>\n            ");
        }
        container.innerHTML = newHtml;
        this.inputElement = document.getElementById('input-comments');
        this.restrictionsElement = container.querySelector('.restrictions');
        var newSendButton = container.querySelector('.send-comments');
        (_d = this.inputElement) === null || _d === void 0 ? void 0 : _d.removeEventListener('input', function () { return _this.TypingText(); });
        (_e = this.inputElement) === null || _e === void 0 ? void 0 : _e.addEventListener('input', function () { return _this.TypingText(); });
        if (this.sendButton) {
            this.sendButton.sendButton = newSendButton;
            this.sendButton.OnClickButton();
        }
        this.CountLenghtSymbols();
        this.TypingText();
    };
    /// Инициализация фильтра
    Input.prototype.InitFilter = function () {
        var _this = this;
        this.filterButton = document.getElementById('filter-button');
        this.filterDropdown = document.getElementById('filter-dropdown');
        var filterArrow = document.getElementById('filter-arrow');
        if (!this.filterButton || !this.filterDropdown)
            return;
        this.filterButton.addEventListener('click', function (e) {
            var _a, _b;
            if (e.target.closest('.filter-arrow'))
                return;
            e.stopPropagation();
            (_a = _this.filterDropdown) === null || _a === void 0 ? void 0 : _a.classList.toggle('show');
            (_b = _this.filterButton) === null || _b === void 0 ? void 0 : _b.classList.toggle('active');
        });
        // Переключение порядка при клике на стрелку
        if (filterArrow) {
            filterArrow.addEventListener('click', function (e) {
                e.stopPropagation();
                _this.currentOrder = _this.currentOrder === 'asc' ? 'desc' : 'asc';
                _this.UpdateArrowRotation();
                _this.ApplyFilter();
            });
        }
        // Закрытие при клике вне
        document.addEventListener('click', function (e) {
            var _a, _b, _c;
            if (!((_a = _this.filterButton) === null || _a === void 0 ? void 0 : _a.contains(e.target))) {
                (_b = _this.filterDropdown) === null || _b === void 0 ? void 0 : _b.classList.remove('show');
                (_c = _this.filterButton) === null || _c === void 0 ? void 0 : _c.classList.remove('active');
            }
        });
        // Выбор опции фильтра
        var options = this.filterDropdown.querySelectorAll('.filter-option');
        options.forEach(function (option) {
            option.addEventListener('click', function (e) {
                var _a, _b;
                e.stopPropagation();
                var filter = option.dataset.filter;
                if (filter) {
                    _this.currentFilter = filter;
                    var filterTextSpan = option.querySelector('span:not(.filter-checkmark)');
                    if (filterTextSpan && _this.filterButton) {
                        var buttonText = _this.filterButton.querySelector('.filter-text');
                        if (buttonText) {
                            buttonText.textContent = filterTextSpan.textContent;
                        }
                    }
                    // Обновляем галочки
                    options.forEach(function (opt) { return opt.classList.remove('active'); });
                    option.classList.add('active');
                    // Закрываем dropdown
                    (_a = _this.filterDropdown) === null || _a === void 0 ? void 0 : _a.classList.remove('show');
                    (_b = _this.filterButton) === null || _b === void 0 ? void 0 : _b.classList.remove('active');
                    // Применяем сортировку
                    _this.ApplyFilter();
                }
            });
        });
        // При инициализации ставим галочку на дефолтный пункт
        var defaultOption = this.filterDropdown.querySelector(".filter-option[data-filter=\"".concat(this.currentFilter, "\"]"));
        if (defaultOption) {
            defaultOption.classList.add('active');
        }
        // Инициализация стрелки
        this.UpdateArrowRotation();
    };
    /// Новый метод для обновления вращения стрелки
    Input.prototype.UpdateArrowRotation = function () {
        var filterArrow = document.getElementById('filter-arrow');
        if (filterArrow) {
            if (this.currentOrder === 'desc') {
                filterArrow.style.transform = 'rotate(180deg)';
            }
            else {
                filterArrow.style.transform = 'rotate(0deg)';
            }
        }
    };
    /// Метод применения фильтра
    Input.prototype.ApplyFilter = function () {
        var _this = this;
        var comments = this.GetSavedComments();
        var sortedComments = __spreadArray([], comments, true);
        // Сортировка
        switch (this.currentFilter) {
            case 'date':
                sortedComments.sort(function (a, b) {
                    var dateA = _this.ParseDate(a.date);
                    var dateB = _this.ParseDate(b.date);
                    return _this.currentOrder === 'asc' ? dateA - dateB : dateB - dateA;
                });
                break;
            case 'rating':
                sortedComments.sort(function (a, b) {
                    return _this.currentOrder === 'asc' ? a.rating - b.rating : b.rating - a.rating;
                });
                break;
            case 'relevance':
                // Актуальность = комбинация рейтинга и даты
                sortedComments.sort(function (a, b) {
                    var dateA = _this.ParseDate(a.date);
                    var dateB = _this.ParseDate(b.date);
                    var now = Date.now();
                    var ageA = now - dateA;
                    var ageB = now - dateB;
                    var scoreA = a.rating * 1000000 - ageA;
                    var scoreB = b.rating * 1000000 - ageB;
                    return _this.currentOrder === 'asc' ? scoreA - scoreB : scoreB - scoreA;
                });
                break;
            case 'replies':
                var replyCounts_1 = {};
                comments.forEach(function (c) {
                    if (c.parentId) {
                        replyCounts_1[c.parentId] = (replyCounts_1[c.parentId] || 0) + 1;
                    }
                });
                sortedComments.sort(function (a, b) {
                    var countA = replyCounts_1[a.id] || 0;
                    var countB = replyCounts_1[b.id] || 0;
                    return _this.currentOrder === 'asc' ? countA - countB : countB - countA;
                });
        }
        // Перерисовка комментариев
        this.RenderSortedComments(sortedComments);
    };
    /// Парсинг даты из строки
    Input.prototype.ParseDate = function (dateStr) {
        if (!dateStr)
            return 0;
        var parts = dateStr.split(' ');
        var date = parts[0];
        var time = parts[1];
        if (!date || !time)
            return 0;
        var dateParts = date.split('.');
        var day = parseInt(dateParts[0] || '0', 10) || 0;
        var month = parseInt(dateParts[1] || '0', 10) || 0;
        var year = parseInt(dateParts[2] || '0', 10) || 0;
        var timeParts = time.split(':');
        var hours = parseInt(timeParts[0] || '0', 10) || 0;
        var minutes = parseInt(timeParts[1] || '0', 10) || 0;
        return new Date(year, month - 1, day, hours, minutes).getTime();
    };
    /// Отрисовка отсортированных комментариев
    Input.prototype.RenderSortedComments = function (comments) {
        var _this = this;
        if (!this.commentsContainer)
            return;
        // Очистка
        var dynamicComments = this.commentsContainer.querySelectorAll('.comment-block');
        dynamicComments.forEach(function (el) { return el.remove(); });
        // Разделение на корневые и ответы
        var roots = comments.filter(function (c) { return !c.parentId; });
        var replies = comments.filter(function (c) { return c.parentId; });
        // Отрисовка корневых
        roots.forEach(function (comment) {
            _this.commentsContainer.insertAdjacentHTML('beforeend', _this.BuildRootCommentHtml(comment));
        });
        // Отрисовка ответов
        replies.forEach(function (reply) {
            var parentEl = _this.commentsContainer.querySelector("[data-comment-id=\"".concat(reply.parentId, "\"]"));
            if (parentEl) {
                var insertAfter = parentEl;
                var next = insertAfter.nextElementSibling;
                while (next && next instanceof HTMLElement && next.classList.contains('lvl-2-nesting')) {
                    insertAfter = next;
                    next = next.nextElementSibling;
                }
                insertAfter.insertAdjacentHTML('afterend', _this.BuildReplyCommentHtml(reply, reply.parentAuthor || 'Автор'));
            }
        });
        GetCountComments();
    };
    return Input;
}());
var Button = /** @class */ (function () {
    function Button(input) {
        this.sendButton = document.querySelector(".send-comments");
        this.input = input;
        this.OnClickButton();
    }
    Button.prototype.OnClickButton = function () {
        var _this = this;
        var _a;
        if (this.sendButton) {
            var newButton = this.sendButton.cloneNode(true);
            (_a = this.sendButton.parentNode) === null || _a === void 0 ? void 0 : _a.replaceChild(newButton, this.sendButton);
            this.sendButton = newButton;
            this.sendButton.addEventListener('click', function () {
                _this.input.SendComment();
                _this.input.OnReset();
                _this.ChangeStateButton(false);
            });
        }
    };
    Button.prototype.ChangeStateButton = function (isActive) {
        if (this.sendButton) {
            this.sendButton.classList.toggle('active', isActive);
            this.sendButton.disabled = !isActive;
        }
    };
    return Button;
}());
