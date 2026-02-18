document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM готов');

    const commentManager = new Input();
    commentManager.LoadCommentsFromStorage();
    commentManager.InitFilter();

    const sendButton = new Button(commentManager);
    commentManager.SetSendButton(sendButton);

    document.getElementById('comments')?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    // Ответить
    if (target.closest('.add-answer')) {
        const commentBlock = target.closest('.comment-block') as HTMLElement;
        if (commentBlock) {
        commentManager.ShowReplyBox(commentBlock);
        }
        return;
    }

    // Рейтинг
    const ratingBtn = target.closest('.rating-button') as HTMLElement | null;
    if (ratingBtn) {
        const action = ratingBtn.dataset.action;
        const commentBlock = ratingBtn.closest('.comment-block') as HTMLElement | null;
        const commentId = commentBlock?.dataset.commentId;
        if (commentId && (action === 'up' || action === 'down')) {
        commentManager.HandleVote(commentId, action as 'up' | 'down');
        }
        return;
    }

    // Избранное
    const favoritesBtn = target.closest('.add-favorites') as HTMLElement | null;
    if (favoritesBtn) {
        const commentBlock = favoritesBtn.closest('.comment-block') as HTMLElement | null;
        const commentId = commentBlock?.dataset.commentId;
        if (commentId) {
        commentManager.ToggleFavorite(commentId);
        }
        return;
    }
    });

    // Переключение вкладок
    document.querySelector('.button-comment')?.addEventListener('click', (e) => {
        e.preventDefault();
        commentManager.ShowAllComments();
    });

    document.querySelector('.favorites-button')?.addEventListener('click', (e) => {
        e.preventDefault();
        commentManager.ShowFavoriteComments();
    });

    commentManager.RebuildInputForm();

    window.addEventListener('resize', () => {
        clearTimeout((window as any).resizeTimeout);
        (window as any).resizeTimeout = setTimeout(() => {
            commentManager.LoadCommentsFromStorage();
            commentManager.RebuildInputForm();
        }, 20);
    });
});

function PadZero(num: number): string {
    return num < 10 ? '0' + num : String(num);
}

interface CommentData {
    id: string;
    parentId?: string | undefined;
    parentAuthor?: string | undefined;
    avatarSrc: string;
    name: string;
    text: string;
    date: string;
    rating: number;
    hasVotedUp: boolean;
    hasVotedDown: boolean;
    isFavorite: boolean;
}

function GenerateId(): string 
{
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function isDesktop(): boolean 
{
    return window.innerWidth >= 1300;
}

/// Счетчик общего количества комментариев
function GetCountComments(): void 
{
    const allBlocks = document.querySelectorAll('.comment-block');
    const count = allBlocks.length;
    const element = document.getElementById("count-comments");
    if (element) {
        element.textContent = `(${count})`;
    }
}

class Input 
{
    inputElement: HTMLTextAreaElement | null;
    sendButton: Button | null = null;
    restrictionsElement: HTMLElement | null;
    countSymbols: number = 0;
    commentsContainer: HTMLElement | null;
    replyToId: string | null = null;
    replyDraftText: string = '';

    currentFilter: string = 'date';
    currentOrder: 'asc' | 'desc' = 'desc';
    filterDropdown: HTMLElement | null = null;
    filterButton: HTMLElement | null = null;

    constructor() 
    {
        this.inputElement = document.getElementById("input-comments") as HTMLTextAreaElement;
        this.restrictionsElement = document.querySelector('.restrictions') as HTMLElement;
        this.inputElement?.addEventListener('input', () => this.TypingText());
        this.commentsContainer = document.getElementById("comments") as HTMLElement;
        
    }
    /// Отправка комментария
    public SendComment(): void
    {
        if (this.inputElement)
        {
            const textComment = this.inputElement.value;
            console.log("Текст комментария:", textComment);
            this.ContainerComment(textComment);

            // Сброс
            this.OnReset();
        }
    }

    /// Контейнер комментариев
    private ContainerComment(textComment: string): void 
    {
        if (this.commentsContainer) {
            const avatarElem = document.getElementById("my-avatar") as HTMLImageElement | null;
            const avatarSrc = avatarElem?.src ?? '';
            const nameElem = document.getElementById("my-name") as HTMLElement | null;
            const name = nameElem?.textContent ?? 'Аноним';

            const now = new Date();
            const date = `${PadZero(now.getDate())}.${PadZero(now.getMonth() + 1)}.${now.getFullYear()} ${PadZero(now.getHours())}:${PadZero(now.getMinutes())}`;

            const newComment: CommentData = {
                id: GenerateId(),
                avatarSrc,
                name,
                text: textComment,
                date,
                rating: 0,
                hasVotedUp: false,
                hasVotedDown: false,
                isFavorite: false
            };

            const savedComments = this.GetSavedComments();
            savedComments.push(newComment);
            localStorage.setItem('comments', JSON.stringify(savedComments));
            this.AppendCommentToDOM(newComment);
            GetCountComments();
        }
    }

    /// Получение сохраненых комментариев
    private GetSavedComments(): CommentData[] 
    {
        const saved = localStorage.getItem('comments');
        if (!saved) return [];
        try {
            return JSON.parse(saved) as CommentData[];
        } catch (e) {
            console.error('Ошибка при чтении комментариев из localStorage', e);
            return [];
        }
    }

    /// Создание основного комментария
    private BuildRootCommentHtml(comment: CommentData): string 
    {
        
        const isReply = !!comment.parentId;
        const classes = ['comment-block'];
        if (isReply) classes.push('lvl-2-nesting');
        const ratingClass = comment.hasVotedUp ? 'voted-up' : comment.hasVotedDown ? 'voted-down' : '';

        if (isDesktop()) {
            return `
                <div class="${classes.join(' ')}" data-comment-id="${comment.id}">
                    <img class="avatar" src="${this.EscapeHtml(comment.avatarSrc)}" width="61" height="61">
                    <div class="input-container">
                        <div class="comment-information-container">
                            <h3 class="name-commentator">${this.EscapeHtml(comment.name)}</h3>
                            <h5 class="comment-date-time">${this.EscapeHtml(comment.date)}</h5>
                        </div>
                        <p class="comment-text">${this.EscapeHtml(comment.text)}</p>
                        <div class="buttons-comment-block">
                            <div class="answer-container">
                                <button class="buttons-comment add-answer">
                                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                                        <g opacity="0.4">
                                            <mask id="mask0_3_259" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="22" height="22">
                                                <rect width="22" height="22" fill="url(#pattern0_3_259)"/>
                                            </mask>
                                            <g mask="url(#mask0_3_259)">
                                                <rect x="-2" y="-1" width="26" height="25" fill="black"/>
                                            </g>
                                        </g>
                                        <defs>
                                            <pattern id="pattern0_3_259" patternContentUnits="objectBoundingBox" width="1" height="1">
                                                <use xlink:href="#image0_3_259" transform="scale(0.01)"/>
                                            </pattern>
                                            <image id="image0_3_259" width="100" height="100" preserveAspectRatio="none" xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAAEvElEQVR4nO2cW4hVVRiAvzONFOOMRWMD6aA1E4OJBVEveQHD7KGHSKiHoKIQAiPQCOshovAlXyL0pZdQH9QuFEQWEdHV7lEYJVFmiZYYRNNNytIzPfxn8njmXNZeZ+3173X2/8HPzJlhzvnX/82+rfXvDYZhGIZhGIZhFIz12gkYwhDwNDClnYgBVwAHEBkmRJnbgeOclmFClBgEdnGmCBOixCLgC5rLMCGRuQ34k9YyTEgkzgG20F6ECYnEBLAPNxkmJGfWAJO4yzAhOXE27rsoE5IzC4AP8JNhQgJzA/AL/jJMSCD6gc1Ale5kmJAAjALv0r0IExKAVcAxwskwIZ6cBTwCnCKsDBPiwQjwGuFFmBAPVgJHyU+GCXGkAjwAnCRfGSbEgbnAK+QvohRCKl3+/QrgKWB+gFxc+R34rRa/1n1/DPi2Lg4jJxWloALcD/xLvC0ja5wAvgJ2AncDlwF9eRRDm/OBPegX3CcmgZeBjcDFoQujwZXAQfQLGyr2I9dLl4QsUizWI7sB7SLmEVVgL3ATclFbaOqb1MoQ3yH/fLNDFC80jU1qZYqfgQeR9f5C0KxJrYxxpFYLNdo1qZU5XgeWdFFXL5Yg5+7agy9qnADupfsLaidcmtQsJF4Ehv3K3JksTWoWp+MIsNyj3m3pQza/wdBvXAJGgTfJ8YBvuyy/qAL3edTbiU6d5xatY7NHvZ2w017/2OJRb2fswtAvHvIptitlnjrxjSpwh0+xXRkCninAQFOKf4DrfIqdhbvo3en3PGKSCItgVyHT09qDTSU+AmZ5VToD5wLPKQ80pXjUr8zZmO7DKnKTQ1HiFNLjHIUVwA85D6gX4gCOC10hppFHkFab1QHey4UBZHBzkP3zeUiz3gW1uBBYCIwB47XfF4FNwMOxPqyv9mFFbCUdBq5B1jF2AF8S5sahrPE3csdxVFYBP3WZeGghzRhGbq97DGkFiiXlpUD5Z2Ie8LZHsjGFNDKOdJq8R/5bz9KcxtCWfuR0L4/B5c04svs9nEPuU8AbEcbQkuuRdpqUhEzTjzTO7Q2c/xQRT4ObMYrsClITUs8ywvYzvxo3/ZnMAh4n/duiryXMAl4VWBw596asQe7pSFUIyK7sHuQ+lW7G8UTsxFsxDnxKukKmWYjsenzHcRyZFywEvfLwmQrd3RWwNn7K7bkF+IN0hUxzNX4PSHhLI9lOTACfk7YQkMWor8l+cC/knVwDwHbSFgIy0foJ2aRsVMnUkTvp3OlSdAaRTnlXIe/opOnOpciMbKpCQBpDPsNNyElk+aDQDAG7SVcIyLrMIdyk3KqUY2bWIesIKQoB2dpdnqC3TStBH1J/GP+NdBZyUC07T+YAz5KmEIAn6SxlgVp2nlSADdpJeDJI55bcm9WyKykraS9kk15q5eV5Wgt5QTGv0jLGzLPGZA/svcJWWs9rDSnmVVouonUL7tKefKBXwTmEHEuaMWFCdNja4ufzTYgO7wPfNPn5vMI/rKuHmYtcm9RzVCMRQ7icmQf1j1UzKjkV4EfOFPK9HUP0mEJWFuuZbUJ0+bDh9YAJ0WVfw+sBlSyM/xmh4cAe5VF1RlvGal//QiYeDcMwDMMwDMMwDMMwjOb8B7T5oNqqo7gkAAAAAElFTkSuQmCC"/>
                                        </defs>
                                    </svg>
                                    Ответить
                                </button>
                            </div>
                            <div class="favorites-container">
                                <button class="buttons-comment add-favorites">
                                    ${this.GetFavoriteIconSvg(comment.isFavorite)}
                                    <span class="favorites-text">${this.GetFavoriteButtonText(comment.isFavorite)}</span>
                                </button>
                            </div>
                            <div class="rating-comment-container">
                                <button class="buttons-comment rating-button demotion" data-action="down">
                                    <svg width="20" height="23" viewBox="0 0 20 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle opacity="0.1" cx="10" cy="13" r="10" fill="black"/>
                                        <path d="M13.0696 11.6399V13.2955H7.26562V11.6399H13.0696Z" fill="#FF0000"/>
                                    </svg>
                                </button>
                                <p class="rating-count ${ratingClass}">${comment.rating}</p>
                                <button class="buttons-comment rating-button increase" data-action="up">
                                    <svg width="20" height="23" viewBox="0 0 20 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle opacity="0.1" cx="10" cy="13" r="10" fill="black"/>
                                        <path d="M9.13281 17.169V8.52699H10.8523V17.169H9.13281ZM5.67472 13.7045V11.9851H14.3168V13.7045H5.67472Z" fill="#8AC540"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        else
        {
            return `
                <div class="${classes.join(' ')}" data-comment-id="${comment.id}">
                    <div class="input-container">
                        <div class="comment-information-container">
                            <img class="avatar" src="${this.EscapeHtml(comment.avatarSrc)}" width="61" height="61">
                            <h3 class="name-commentator">${this.EscapeHtml(comment.name)}</h3>
                            <h5 class="comment-date-time">${this.EscapeHtml(comment.date)}</h5>
                        </div>
                        <p class="comment-text">${this.EscapeHtml(comment.text)}</p>
                        <div class="buttons-comment-block">
                            <div class="answer-container">
                                <button class="buttons-comment add-answer">
                                    <!-- тот же SVG -->
                                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                                        <g opacity="0.4">
                                            <mask id="mask0_3_259" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="22" height="22">
                                                <rect width="22" height="22" fill="url(#pattern0_3_259)"/>
                                            </mask>
                                            <g mask="url(#mask0_3_259)">
                                                <rect x="-2" y="-1" width="26" height="25" fill="black"/>
                                            </g>
                                        </g>
                                        <defs>
                                            <pattern id="pattern0_3_259" patternContentUnits="objectBoundingBox" width="1" height="1">
                                                <use xlink:href="#image0_3_259" transform="scale(0.01)"/>
                                            </pattern>
                                            <image id="image0_3_259" width="100" height="100" preserveAspectRatio="none" xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAAEvElEQVR4nO2cW4hVVRiAvzONFOOMRWMD6aA1E4OJBVEveQHD7KGHSKiHoKIQAiPQCOshovAlXyL0pZdQH9QuFEQWEdHV7lEYJVFmiZYYRNNNytIzPfxn8njmXNZeZ+3173X2/8HPzJlhzvnX/82+rfXvDYZhGIZhGIZhFIz12gkYwhDwNDClnYgBVwAHEBkmRJnbgeOclmFClBgEdnGmCBOixCLgC5rLMCGRuQ34k9YyTEgkzgG20F6ECYnEBLAPNxkmJGfWAJO4yzAhOXE27rsoE5IzC4AP8JNhQgJzA/AL/jJMSCD6gc1Ale5kmJAAjALv0r0IExKAVcAxwskwIZ6cBTwCnCKsDBPiwQjwGuFFmBAPVgJHyU+GCXGkAjwAnCRfGSbEgbnAK+QvohRCKl3+/QrgKWB+gFxc+R34rRa/1n1/DPi2Lg4jJxWloALcD/xLvC0ja5wAvgJ2AncDlwF9eRRDm/OBPegX3CcmgZeBjcDFoQujwZXAQfQLGyr2I9dLl4QsUizWI7sB7SLmEVVgL3ATclFbaOqb1MoQ3yH/fLNDFC80jU1qZYqfgQeR9f5C0KxJrYxxpFYLNdo1qZU5XgeWdFFXL5Yg5+7agy9qnADupfsLaidcmtQsJF4Ehv3K3JksTWoWp+MIsNyj3m3pQza/wdBvXAJGgTfJ8YBvuyy/qAL3edTbiU6d5xatY7NHvZ2w017/2OJRb2fswtAvHvIptitlnjrxjSpwh0+xXRkCninAQFOKf4DrfIqdhbvo3en3PGKSCItgVyHT09qDTSU+AmZ5VToD5wLPKQ80pXjUr8zZmO7DKnKTQ1HiFNLjHIUVwA85D6gX4gCOC10hppFHkFab1QHey4UBZHBzkP3zeUiz3gW1uBBYCIwB47XfF4FNwMOxPqyv9mFFbCUdBq5B1jF2AF8S5sahrPE3csdxVFYBP3WZeGghzRhGbq97DGkFiiXlpUD5Z2Ie8LZHsjGFNDKOdJq8R/5bz9KcxtCWfuR0L4/B5c04svs9nEPuU8AbEcbQkuuRdpqUhEzTjzTO7Q2c/xQRT4ObMYrsClITUs8ywvYzvxo3/ZnMAh4n/duiryXMAl4VWBw596asQe7pSFUIyK7sHuQ+lW7G8UTsxFsxDnxKukKmWYjsenzHcRyZFywEvfLwmQrd3RWwNn7K7bkF+IN0hUxzNX4PSHhLI9lOTACfk7YQkMWor8l+cC/knVwDwHbSFgIy0foJ2aRsVMnUkTvp3OlSdAaRTnlXIe/opOnOpciMbKpCQBpDPsNNyElk+aDQDAG7SVcIyLrMIdyk3KqUY2bWIesIKQoB2dpdnqC3TStBH1J/GP+NdBZyUC07T+YAz5KmEIAn6SxlgVp2nlSADdpJeDJI55bcm9WyKykraS9kk15q5eV5Wgt5QTGv0jLGzLPGZA/svcJWWs9rDSnmVVouonUL7tKefKBXwTmEHEuaMWFCdNja4ufzTYgO7wPfNPn5vMI/rKuHmYtcm9RzVCMRQ7icmQf1j1UzKjkV4EfOFPK9HUP0mEJWFuuZbUJ0+bDh9YAJ0WVfw+sBlSyM/xmh4cAe5VF1RlvGal//QiYeDcMwDMMwDMMwDMMwjOb8B7T5oNqqo7gkAAAAAElFTkSuQmCC"/>
                                        </defs>
                                    </svg>
                                    Ответить
                                </button>
                            </div>
                            <div class="favorites-container">
                                <button class="buttons-comment add-favorites">
                                    ${this.GetFavoriteIconSvg(comment.isFavorite)}
                                    <span class="favorites-text">${this.GetFavoriteButtonText(comment.isFavorite)}</span>
                                </button>
                            </div>
                            <div class="rating-comment-container">
                                <button class="buttons-comment rating-button demotion" data-action="down">
                                    <svg width="20" height="23" viewBox="0 0 20 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle opacity="0.1" cx="10" cy="13" r="10" fill="black"/>
                                        <path d="M13.0696 11.6399V13.2955H7.26562V11.6399H13.0696Z" fill="#FF0000"/>
                                    </svg>
                                </button>
                                <p class="rating-count ${ratingClass}">${comment.rating}</p>
                                <button class="buttons-comment rating-button increase" data-action="up">
                                    <svg width="20" height="23" viewBox="0 0 20 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle opacity="0.1" cx="10" cy="13" r="10" fill="black"/>
                                        <path d="M9.13281 17.169V8.52699H10.8523V17.169H9.13281ZM5.67472 13.7045V11.9851H14.3168V13.7045H5.67472Z" fill="#8AC540"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    /// Получение svg кнопки Избранное
    private GetFavoriteIconSvg(isFavorite: boolean): string 
    {
        if (isFavorite) {
            return `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                <g opacity="0.4">
                <mask id="mask0_3_263" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
                <rect width="24" height="24" fill="url(#pattern0_3_263)"/>
                </mask>
                <g mask="url(#mask0_3_263)">
                <rect x="-1.25" width="29.5" height="27.5" fill="black"/>
                </g>
                </g>
                <defs>
                <pattern id="pattern0_3_263" patternContentUnits="objectBoundingBox" width="1" height="1">
                <use xlink:href="#image0_3_263" transform="scale(0.0104167)"/>
                </pattern>
                <image id="image0_3_263" width="96" height="96" preserveAspectRatio="none" xlink:href="data:image/png;base64,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"/>
                </defs>
                </svg>
            `;
        } else {
            return `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                <mask id="mask0_3_291" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
                <rect width="24" height="24" fill="url(#pattern0_3_291)"/>
                </mask>
                <g mask="url(#mask0_3_291)">
                <rect opacity="0.4" x="2" y="4" width="21" height="19" fill="black"/>
                <path d="M3.5 9.00004C2.5 12.9999 8.83333 17.3333 12 20C20 14.4 21.1667 10.5001 20.5 9.00004C18.5 4.20004 13.8333 6.16667 12 8.00001C7 3.5 4.5 6.50002 3.5 9.00004Z" fill="white"/>
                </g>
                <defs>
                <pattern id="pattern0_3_291" patternContentUnits="objectBoundingBox" width="1" height="1">
                <use xlink:href="#image0_3_291" transform="scale(0.0104167)"/>
                </pattern>
                <image id="image0_3_291" width="96" height="96" preserveAspectRatio="none" xlink:href="data:image/png;base64,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"/>
                </defs>
                </svg>
            `;
        }
    }

    /// Получение текста кнопки 
    private GetFavoriteButtonText(isFavorite: boolean): string 
    {
        return isFavorite ? ' В избранном' : ' В избранное';
    }

    /// Ответ на комментарий
    private BuildReplyCommentHtml(comment: CommentData, parentAuthor: string): string 
    {
        const ratingClass = comment.hasVotedUp ? 'voted-up' : comment.hasVotedDown ? 'voted-down' : '';
        if (isDesktop()) {
            return `
            <div class="comment-block lvl-2-nesting" data-comment-id="${comment.id}">
                <img class="avatar" src="${this.EscapeHtml(comment.avatarSrc)}" width="61" height="61">
                <div class="input-container">
                    <div class="comment-information-container">
                        <h3 class="name-commentator">${this.EscapeHtml(comment.name)}</h3>
                        <div class="name-answer">
                            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                                <g opacity="0.4">
                                <mask id="mask0_3_259" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="22" height="22">
                                <rect width="22" height="22" fill="url(#pattern0_3_259)"/>
                                </mask>
                                <g mask="url(#mask0_3_259)">
                                <rect x="-2" y="-1" width="26" height="25" fill="black"/>
                                </g>
                                </g>
                                <defs>
                                <pattern id="pattern0_3_259" patternContentUnits="objectBoundingBox" width="1" height="1">
                                <use xlink:href="#image0_3_259" transform="scale(0.01)"/>
                                </pattern>
                                <image id="image0_3_259" width="100" height="100" preserveAspectRatio="none" xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAAEvElEQVR4nO2cW4hVVRiAvzONFOOMRWMD6aA1E4OJBVEveQHD7KGHSKiHoKIQAiPQCOshovAlXyL0pZdQH9QuFEQWEdHV7lEYJVFmiZYYRNNNytIzPfxn8njmXNZeZ+3173X2/8HPzJlhzvnX/82+rfXvDYZhGIZhGIZhFIz12gkYwhDwNDClnYgBVwAHEBkmRJnbgeOclmFClBgEdnGmCBOixCLgC5rLMCGRuQ34k9YyTEgkzgG20F6ECYnEBLAPNxkmJGfWAJO4yzAhOXE27rsoE5IzC4AP8JNhQgJzA/AL/jJMSCD6gc1Ale5kmJAAjALv0r0IExKAVcAxwskwIZ6cBTwCnCKsDBPiwQjwGuFFmBAPVgJHyU+GCXGkAjwAnCRfGSbEgbnAK+QvohRCKl3+/QrgKWB+gFxc+R34rRa/1n1/DPi2Lg4jJxWloALcD/xLvC0ja5wAvgJ2AncDlwF9eRRDm/OBPegX3CcmgZeBjcDFoQujwZXAQfQLGyr2I9dLl4QsUizWI7sB7SLmEVVgL3ATclFbaOqb1MoQ3yH/fLNDFC80jU1qZYqfgQeR9f5C0KxJrYxxpFYLNdo1qZU5XgeWdFFXL5Yg5+7agy9qnADupfsLaidcmtQsJF4Ehv3K3JksTWoWp+MIsNyj3m3pQza/wdBvXAJGgTfJ8YBvuyy/qAL3edTbiU6d5xatY7NHvZ2w017/2OJRb2fswtAvHvIptitlnjrxjSpwh0+xXRkCninAQFOKf4DrfIqdhbvo3en3PGKSCItgVyHT09qDTSU+AmZ5VToD5wLPKQ80pXjUr8zZmO7DKnKTQ1HiFNLjHIUVwA85D6gX4gCOC10hppFHkFab1QHey4UBZHBzkP3zeUiz3gW1uBBYCIwB47XfF4FNwMOxPqyv9mFFbCUdBq5B1jF2AF8S5sahrPE3csdxVFYBP3WZeGghzRhGbq97DGkFiiXlpUD5Z2Ie8LZHsjGFNDKOdJq8R/5bz9KcxtCWfuR0L4/B5c04svs9nEPuU8AbEcbQkuuRdpqUhEzTjzTO7Q2c/xQRT4ObMYrsClITUs8ywvYzvxo3/ZnMAh4n/duiryXMAl4VWBw596asQe7pSFUIyK7sHuQ+lW7G8UTsxFsxDnxKukKmWYjsenzHcRyZFywEvfLwmQrd3RWwNn7K7bkF+IN0hUxzNX4PSHhLI9lOTACfk7YQkMWor8l+cC/knVwDwHbSFgIy0foJ2aRsVMnUkTvp3OlSdAaRTnlXIe/opOnOpciMbKpCQBpDPsNNyElk+aDQDAG7SVcIyLrMIdyk3KqUY2bWIesIKQoB2dpdnqC3TStBH1J/GP+NdBZyUC07T+YAz5KmEIAn6SxlgVp2nlSADdpJeDJI55bcm9WyKykraS9kk15q5eV5Wgt5QTGv0jLGzLPGZA/svcJWWs9rDSnmVVouonUL7tKefKBXwTmEHEuaMWFCdNja4ufzTYgO7wPfNPn5vMI/rKuHmYtcm9RzVCMRQ7icmQf1j1UzKjkV4EfOFPK9HUP0mEJWFuuZbUJ0+bDh9YAJ0WVfw+sBlSyM/xmh4cAe5VF1RlvGal//QiYeDcMwDMMwDMMwDMMwjOb8B7T5oNqqo7gkAAAAAElFTkSuQmCC"/>
                                </defs>
                            </svg>
                            <h3 class="buttons-comment answer">${this.EscapeHtml(parentAuthor)}</h3>
                        </div>
                        <h5 class="comment-date-time">${this.EscapeHtml(comment.date)}</h5>
                    </div>
                    <p class="comment-text">${this.EscapeHtml(comment.text)}</p>
                    <div class="buttons-comment-block">
                        <div class="favorites-container">
                            <button class="buttons-comment add-favorites">
                                ${this.GetFavoriteIconSvg(comment.isFavorite)}
                                <span class="favorites-text">${this.GetFavoriteButtonText(comment.isFavorite)}</span>
                            </button>
                        </div>
                        <div class="rating-comment-container">
                            <button class="buttons-comment rating-button demotion" data-action="down">
                                <svg width="20" height="23" viewBox="0 0 20 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle opacity="0.1" cx="10" cy="13" r="10" fill="black"/>
                                    <path d="M13.0696 11.6399V13.2955H7.26562V11.6399H13.0696Z" fill="#FF0000"/>
                                </svg>
                            </button>
                            <p class="rating-count ${ratingClass}">${comment.rating}</p>
                            <button class="buttons-comment rating-button increase" data-action="up">
                                <svg width="20" height="23" viewBox="0 0 20 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle opacity="0.1" cx="10" cy="13" r="10" fill="black"/>
                                    <path d="M9.13281 17.169V8.52699H10.8523V17.169H9.13281ZM5.67472 13.7045V11.9851H14.3168V13.7045H5.67472Z" fill="#8AC540"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
        }
        else
        {
            return `
            <div class="comment-block lvl-2-nesting" data-comment-id="${comment.id}">
                
                <div class="input-container">
                    <div class="comment-information-container">
                        <img class="avatar" src="${this.EscapeHtml(comment.avatarSrc)}" width="61" height="61">
                        <h3 class="name-commentator">${this.EscapeHtml(comment.name)}</h3>
                        
                        <h5 class="comment-date-time">${this.EscapeHtml(comment.date)}</h5>
                    </div>
                    <div class="name-answer">
                            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                                <g opacity="0.4">
                                <mask id="mask0_3_259" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="22" height="22">
                                <rect width="22" height="22" fill="url(#pattern0_3_259)"/>
                                </mask>
                                <g mask="url(#mask0_3_259)">
                                <rect x="-2" y="-1" width="26" height="25" fill="black"/>
                                </g>
                                </g>
                                <defs>
                                <pattern id="pattern0_3_259" patternContentUnits="objectBoundingBox" width="1" height="1">
                                <use xlink:href="#image0_3_259" transform="scale(0.01)"/>
                                </pattern>
                                <image id="image0_3_259" width="100" height="100" preserveAspectRatio="none" xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAAEvElEQVR4nO2cW4hVVRiAvzONFOOMRWMD6aA1E4OJBVEveQHD7KGHSKiHoKIQAiPQCOshovAlXyL0pZdQH9QuFEQWEdHV7lEYJVFmiZYYRNNNytIzPfxn8njmXNZeZ+3173X2/8HPzJlhzvnX/82+rfXvDYZhGIZhGIZhFIz12gkYwhDwNDClnYgBVwAHEBkmRJnbgeOclmFClBgEdnGmCBOixCLgC5rLMCGRuQ34k9YyTEgkzgG20F6ECYnEBLAPNxkmJGfWAJO4yzAhOXE27rsoE5IzC4AP8JNhQgJzA/AL/jJMSCD6gc1Ale5kmJAAjALv0r0IExKAVcAxwskwIZ6cBTwCnCKsDBPiwQjwGuFFmBAPVgJHyU+GCXGkAjwAnCRfGSbEgbnAK+QvohRCKl3+/QrgKWB+gFxc+R34rRa/1n1/DPi2Lg4jJxWloALcD/xLvC0ja5wAvgJ2AncDlwF9eRRDm/OBPegX3CcmgZeBjcDFoQujwZXAQfQLGyr2I9dLl4QsUizWI7sB7SLmEVVgL3ATclFbaOqb1MoQ3yH/fLNDFC80jU1qZYqfgQeR9f5C0KxJrYxxpFYLNdo1qZU5XgeWdFFXL5Yg5+7agy9qnADupfsLaidcmtQsJF4Ehv3K3JksTWoWp+MIsNyj3m3pQza/wdBvXAJGgTfJ8YBvuyy/qAL3edTbiU6d5xatY7NHvZ2w017/2OJRb2fswtAvHvIptitlnjrxjSpwh0+xXRkCninAQFOKf4DrfIqdhbvo3en3PGKSCItgVyHT09qDTSU+AmZ5VToD5wLPKQ80pXjUr8zZmO7DKnKTQ1HiFNLjHIUVwA85D6gX4gCOC10hppFHkFab1QHey4UBZHBzkP3zeUiz3gW1uBBYCIwB47XfF4FNwMOxPqyv9mFFbCUdBq5B1jF2AF8S5sahrPE3csdxVFYBP3WZeGghzRhGbq97DGkFiiXlpUD5Z2Ie8LZHsjGFNDKOdJq8R/5bz9KcxtCWfuR0L4/B5c04svs9nEPuU8AbEcbQkuuRdpqUhEzTjzTO7Q2c/xQRT4ObMYrsClITUs8ywvYzvxo3/ZnMAh4n/duiryXMAl4VWBw596asQe7pSFUIyK7sHuQ+lW7G8UTsxFsxDnxKukKmWYjsenzHcRyZFywEvfLwmQrd3RWwNn7K7bkF+IN0hUxzNX4PSHhLI9lOTACfk7YQkMWor8l+cC/knVwDwHbSFgIy0foJ2aRsVMnUkTvp3OlSdAaRTnlXIe/opOnOpciMbKpCQBpDPsNNyElk+aDQDAG7SVcIyLrMIdyk3KqUY2bWIesIKQoB2dpdnqC3TStBH1J/GP+NdBZyUC07T+YAz5KmEIAn6SxlgVp2nlSADdpJeDJI55bcm9WyKykraS9kk15q5eV5Wgt5QTGv0jLGzLPGZA/svcJWWs9rDSnmVVouonUL7tKefKBXwTmEHEuaMWFCdNja4ufzTYgO7wPfNPn5vMI/rKuHmYtcm9RzVCMRQ7icmQf1j1UzKjkV4EfOFPK9HUP0mEJWFuuZbUJ0+bDh9YAJ0WVfw+sBlSyM/xmh4cAe5VF1RlvGal//QiYeDcMwDMMwDMMwDMMwjOb8B7T5oNqqo7gkAAAAAElFTkSuQmCC"/>
                                </defs>
                            </svg>
                            <h3 class="buttons-comment answer">${this.EscapeHtml(parentAuthor)}</h3>
                        </div>
                    <p class="comment-text">${this.EscapeHtml(comment.text)}</p>
                    <div class="buttons-comment-block">
                        <div class="favorites-container">
                            <button class="buttons-comment add-favorites">
                                ${this.GetFavoriteIconSvg(comment.isFavorite)}
                                <span class="favorites-text">${this.GetFavoriteButtonText(comment.isFavorite)}</span>
                            </button>
                        </div>
                        <div class="rating-comment-container">
                            <button class="buttons-comment rating-button demotion" data-action="down">
                                <svg width="20" height="23" viewBox="0 0 20 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle opacity="0.1" cx="10" cy="13" r="10" fill="black"/>
                                    <path d="M13.0696 11.6399V13.2955H7.26562V11.6399H13.0696Z" fill="#FF0000"/>
                                </svg>
                            </button>
                            <p class="rating-count ${ratingClass}">${comment.rating}</p>
                            <button class="buttons-comment rating-button increase" data-action="up">
                                <svg width="20" height="23" viewBox="0 0 20 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle opacity="0.1" cx="10" cy="13" r="10" fill="black"/>
                                    <path d="M9.13281 17.169V8.52699H10.8523V17.169H9.13281ZM5.67472 13.7045V11.9851H14.3168V13.7045H5.67472Z" fill="#8AC540"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
        }
    }

    /// Добавить комментарий
    private AppendCommentToDOM(comment: CommentData): void 
    {
        let html = '';
        if (comment.parentId) {
            const targetAuthor = 'Автор';
            html = this.BuildReplyCommentHtml(comment, targetAuthor);
        } else {
            html = this.BuildRootCommentHtml(comment);
        }
        this.commentsContainer?.insertAdjacentHTML('beforeend', html);
    }

    private EscapeHtml(text: string): string 
    {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /// Загрузка комментариев из хранилища
    public LoadCommentsFromStorage(): void {
        const scrollY = window.scrollY;
        const openReplyParentId = this.replyToId;
        const openReplyDraft = this.replyDraftText;
        
        const comments = this.GetSavedComments();
        if (!this.commentsContainer) return;
        
        const dynamicComments = this.commentsContainer.querySelectorAll('.comment-block:not(.reply-input-container)');
        dynamicComments.forEach(el => el.remove());
        
        // Разделить на корневые и ответы
        const roots: CommentData[] = [];
        const replies: CommentData[] = [];
        comments.forEach(comment => {
            if (comment.parentId) {
                replies.push(comment);
            } else {
                roots.push(comment);
            }
        });
        
        // Сначала добавить корневые
        roots.forEach(comment => {
            this.AppendCommentToDOM(comment);
        });
        
        // Потом ответы
        replies.forEach(reply => {
            const parentEl = this.commentsContainer!.querySelector(`[data-comment-id="${reply.parentId}"]`);
            if (parentEl) {
                let insertAfter = parentEl;
                let next = insertAfter.nextElementSibling;
                while (next && next instanceof HTMLElement && next.classList.contains('lvl-2-nesting')) {
                    insertAfter = next;
                    next = next.nextElementSibling;
                }
                insertAfter.insertAdjacentHTML('afterend', this.BuildReplyCommentHtml(reply, reply.parentAuthor || 'Автор'));
            } else {
                this.commentsContainer!.insertAdjacentHTML('beforeend', this.BuildReplyCommentHtml(reply, reply.parentAuthor || 'Автор'));
            }
        });
        
        this.ApplyFilter();
        
        if (openReplyParentId) {
            const parentEl = this.commentsContainer.querySelector(`[data-comment-id="${openReplyParentId}"]`) as HTMLElement;
            if (parentEl) {
                this.replyToId = openReplyParentId;
                this.replyDraftText = openReplyDraft;
                this.ShowReplyBox(parentEl);
            } else {
                this.replyToId = null;
                this.replyDraftText = '';
            }
        }
        
        GetCountComments();
        
        setTimeout(() => {
            window.scrollTo(0, scrollY);
        }, 0);
    }

    /// Инициализация кнопки
    public SetSendButton(button: Button):void
    {
        this.sendButton = button;
    }

    /// Триггер, когда печатается текст
    private TypingText(): void 
    {
        if (this.inputElement && this.sendButton)
        {
            const textarea = this.inputElement;
            const wrapper = textarea.parentElement as HTMLElement | null;
            if (!wrapper) return;

            const isText = textarea.value.trim().length > 0;

            textarea.style.height = 'auto';

            const scrollHeight = textarea.scrollHeight;
            const maxHeight = 225;

            let newHeight = scrollHeight;
            if (newHeight < 61) newHeight = 61;
            if (newHeight > maxHeight) {
                newHeight = maxHeight;
                textarea.classList.add('growing');
            } else {
                textarea.classList.remove('growing');
            }

            wrapper.style.height = newHeight + 'px';
            textarea.style.height = '100%';

            this.sendButton.ChangeStateButton(isText);
            this.CountLenghtSymbols();
        }
    }

    /// Счётчик длины введённого текста
    private CountLenghtSymbols():void
    {
        if (this.restrictionsElement && this.inputElement && this.sendButton)
        {
            this.countSymbols = this.inputElement.value.length;
            //this.sendButton.ChangeStateButton(true);

            if (this.countSymbols <= 0)
            {
                this.restrictionsElement.textContent = `Макс. 1000 символов`;
                this.restrictionsElement.style.color = `#999999`;
                this.WarningActive(false);
            }
            else if (this.countSymbols > 1000)
            {
                this.restrictionsElement.style.color = `red`;
                this.restrictionsElement.textContent = `${this.countSymbols}/1000`;
                this.sendButton.ChangeStateButton(false);
                this.WarningActive(true);
            }
            else
            {
                this.restrictionsElement.textContent = `${this.countSymbols}/1000`;
                this.restrictionsElement.style.color = `#999999`;
                this.WarningActive(false);
            }
        }
    }

    /// Настройка стиля для текста предупреждения
    private WarningActive(param:boolean):void
    {
        const warningText = document.querySelector(".limit-count") as HTMLElement;
        if (this.sendButton && this.sendButton.sendButton && warningText)
        {
            if (param)
            {
                warningText.style.display = "block";
                if (isDesktop())
                    this.sendButton.sendButton.style.margin = "26px 0 auto 0";
                else
                    this.sendButton.sendButton.style.margin = "0";
            }
            else
            {
                warningText.style.display = "none";
                if (isDesktop())
                    this.sendButton.sendButton.style.margin = "40px 0 auto 0";
                else
                    this.sendButton.sendButton.style.margin = "0";
            }
                
        }
    }

    /// Сброс после отправки
    public OnReset():void
    {
        if (this.inputElement)
        {
            this.inputElement.value = '';
        }
        
        this.CountLenghtSymbols();

        if (this.inputElement)
        {
            const textarea = this.inputElement;
            const wrapper = textarea.parentElement as HTMLElement | null;

            if (wrapper)
                wrapper.style.height = `61px`;
        }
    }

    /// Показ поля для ответа
    public ShowReplyBox(parentComment: HTMLElement): void 
    {
        const parentId = (parentComment as HTMLElement).dataset.commentId;
    
        const existing = this.commentsContainer?.querySelector(`.reply-input-container[data-parent-id="${parentId}"]`);
        if (existing) {
            const textarea = existing.querySelector('textarea') as HTMLTextAreaElement;
            textarea?.focus();
            return;
        }
        
        if (!parentId) {
            alert('Ошибка: нельзя ответить на этот комментарий.');
            return;
        }

        const targetAuthor = parentComment.querySelector('.name-commentator')?.textContent || 'Автор';
        let replyHtml = ``;
        if (isDesktop()){
            replyHtml = `
                <div class="comment-block lvl-2-nesting reply-input-container" data-parent-id="${parentId}">
                    <img class="avatar" id="my-avatar" src="../images/KorbenDetka.png" width="61" height="61">    
                    <div class="input-container">
                        <div class="input-information-container">
                            <h3 id="my-name" class="name-commentator">Илья Васильевич</h3>
                            <div class="name-answer">
                                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                                    <g opacity="0.4">
                                        <mask id="mask0_3_259" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="22" height="22">
                                            <rect width="22" height="22" fill="url(#pattern0_3_259)"/>
                                        </mask>
                                        <g mask="url(#mask0_3_259)">
                                            <rect x="-2" y="-1" width="26" height="25" fill="black"/>
                                        </g>
                                    </g>
                                    <defs>
                                        <pattern id="pattern0_3_259" patternContentUnits="objectBoundingBox" width="1" height="1">
                                            <use xlink:href="#image0_3_259" transform="scale(0.01)"/>
                                        </pattern>
                                        <image id="image0_3_259" width="100" height="100" preserveAspectRatio="none" xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAAEvElEQVR4nO2cW4hVVRiAvzONFOOMRWMD6aA1E4OJBVEveQHD7KGHSKiHoKIQAiPQCOshovAlXyL0pZdQH9QuFEQWEdHV7lEYJVFmiZYYRNNNytIzPfxn8njmXNZeZ+3173X2/8HPzJlhzvnX/82+rfXvDYZhGIZhGIZhFIz12gkYwhDwNDClnYgBVwAHEBkmRJnbgeOclmFClBgEdnGmCBOixCLgC5rLMCGRuQ34k9YyTEgkzgG20F6ECYnEBLAPNxkmJGfWAJO4yzAhOXE27rsoE5IzC4AP8JNhQgJzA/AL/jJMSCD6gc1Ale5kmJAAjALv0r0IExKAVcAxwskwIZ6cBTwCnCKsDBPiwQjwGuFFmBAPVgJHyU+GCXGkAjwAnCRfGSbEgbnAK+QvohRCKl3+/QrgKWB+gFxc+R34rRa/1n1/DPi2Lg4jJxWloALcD/xLvC0ja5wAvgJ2AncDlwF9eRRDm/OBPegX3CcmgZeBjcDFoQujwZXAQfQLGyr2I9dLl4QsUizWI7sB7SLmEVVgL3ATclFbaOqb1MoQ3yH/fLNDFC80jU1qZYqfgQeR9f5C0KxJrYxxpFYLNdo1qZU5XgeWdFFXL5Yg5+7agy9qnADupfsLaidcmtQsJF4Ehv3K3JksTWoWp+MIsNyj3m3pQza/wdBvXAJGgTfJ8YBvuyy/qAL3edTbiU6d5xatY7NHvZ2w017/2OJRb2fswtAvHvIptitlnjrxjSpwh0+xXRkCninAQFOKf4DrfIqdhbvo3en3PGKSCItgVyHT09qDTSU+AmZ5VToD5wLPKQ80pXjUr8zZmO7DKnKTQ1HiFNLjHIUVwA85D6gX4gCOC10hppFHkFab1QHey4UBZHBzkP3zeUiz3gW1uBBYCIwB47XfF4FNwMOxPqyv9mFFbCUdBq5B1jF2AF8S5sahrPE3csdxVFYBP3WZeGghzRhGbq97DGkFiiXlpUD5Z2Ie8LZHsjGFNDKOdJq8R/5bz9KcxtCWfuR0L4/B5c04svs9nEPuU8AbEcbQkuuRdpqUhEzTjzTO7Q2c/xQRT4ObMYrsClITUs8ywvYzvxo3/ZnMAh4n/duiryXMAl4VWBw596asQe7pSFUIyK7sHuQ+lW7G8UTsxFsxDnxKukKmWYjsenzHcRyZFywEvfLwmQrd3RWwNn7K7bkF+IN0hUxzNX4PSHhLI9lOTACfk7YQkMWor8l+cC/knVwDwHbSFgIy0foJ2aRsVMnUkTvp3OlSdAaRTnlXIe/opOnOpciMbKpCQBpDPsNNyElk+aDQDAG7SVcIyLrMIdyk3KqUY2bWIesIKQoB2dpdnqC3TStBH1J/GP+NdBZyUC07T+YAz5KmEIAn6SxlgVp2nlSADdpJeDJI55bcm9WyKykraS9kk15q5eV5Wgt5QTGv0jLGzLPGZA/svcJWWs9rDSnmVVouonUL7tKefKBXwTmEHEuaMWFCdNja4ufzTYgO7wPfNPn5vMI/rKuHmYtcm9RzVCMRQ7icmQf1j1UzKjkV4EfOFPK9HUP0mEJWFuuZbUJ0+bDh9YAJ0WVfw+sBlSyM/xmh4cAe5VF1RlvGal//QiYeDcMwDMMwDMMwDMMwjOb8B7T5oNqqo7gkAAAAAElFTkSuQmCC"/>
                                    </defs>
                                </svg>
                                <h3 class="buttons-comment answer">${this.EscapeHtml(targetAuthor)}</h3>
                            </div>
                            <h5 class="restrictions">Макс. 1000 символов</h5>
                        </div>
                        <div class="textarea-wrapper">
                            <textarea class="input-comments" rows="1" placeholder="Введите текст ответа..."></textarea>
                        </div>
                    </div>
                    <div class="button-container">
                        <h5 class="limit-count">Слишком длинное сообщение</h5>
                        <button class="send-comments" disabled>Отправить ответ</button>
                    </div>
                </div>
            `;
        }
        else{
            replyHtml = `
                <div class="comment-block lvl-2-nesting reply-input-container" data-parent-id="${parentId}">   
                    <div class="input-container">
                        <div class="input-information-container">
                            <img class="avatar" id="my-avatar" src="../images/KorbenDetka.png" width="61" height="61">
                            <h3 id="my-name" class="name-commentator">Илья Васильевич</h3>
                            <div class="name-answer">
                                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                                    <g opacity="0.4">
                                        <mask id="mask0_3_259" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="22" height="22">
                                            <rect width="22" height="22" fill="url(#pattern0_3_259)"/>
                                        </mask>
                                        <g mask="url(#mask0_3_259)">
                                            <rect x="-2" y="-1" width="26" height="25" fill="black"/>
                                        </g>
                                    </g>
                                    <defs>
                                        <pattern id="pattern0_3_259" patternContentUnits="objectBoundingBox" width="1" height="1">
                                            <use xlink:href="#image0_3_259" transform="scale(0.01)"/>
                                        </pattern>
                                        <image id="image0_3_259" width="100" height="100" preserveAspectRatio="none" xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAAEvElEQVR4nO2cW4hVVRiAvzONFOOMRWMD6aA1E4OJBVEveQHD7KGHSKiHoKIQAiPQCOshovAlXyL0pZdQH9QuFEQWEdHV7lEYJVFmiZYYRNNNytIzPfxn8njmXNZeZ+3173X2/8HPzJlhzvnX/82+rfXvDYZhGIZhGIZhFIz12gkYwhDwNDClnYgBVwAHEBkmRJnbgeOclmFClBgEdnGmCBOixCLgC5rLMCGRuQ34k9YyTEgkzgG20F6ECYnEBLAPNxkmJGfWAJO4yzAhOXE27rsoE5IzC4AP8JNhQgJzA/AL/jJMSCD6gc1Ale5kmJAAjALv0r0IExKAVcAxwskwIZ6cBTwCnCKsDBPiwQjwGuFFmBAPVgJHyU+GCXGkAjwAnCRfGSbEgbnAK+QvohRCKl3+/QrgKWB+gFxc+R34rRa/1n1/DPi2Lg4jJxWloALcD/xLvC0ja5wAvgJ2AncDlwF9eRRDm/OBPegX3CcmgZeBjcDFoQujwZXAQfQLGyr2I9dLl4QsUizWI7sB7SLmEVVgL3ATclFbaOqb1MoQ3yH/fLNDFC80jU1qZYqfgQeR9f5C0KxJrYxxpFYLNdo1qZU5XgeWdFFXL5Yg5+7agy9qnADupfsLaidcmtQsJF4Ehv3K3JksTWoWp+MIsNyj3m3pQza/wdBvXAJGgTfJ8YBvuyy/qAL3edTbiU6d5xatY7NHvZ2w017/2OJRb2fswtAvHvIptitlnjrxjSpwh0+xXRkCninAQFOKf4DrfIqdhbvo3en3PGKSCItgVyHT09qDTSU+AmZ5VToD5wLPKQ80pXjUr8zZmO7DKnKTQ1HiFNLjHIUVwA85D6gX4gCOC10hppFHkFab1QHey4UBZHBzkP3zeUiz3gW1uBBYCIwB47XfF4FNwMOxPqyv9mFFbCUdBq5B1jF2AF8S5sahrPE3csdxVFYBP3WZeGghzRhGbq97DGkFiiXlpUD5Z2Ie8LZHsjGFNDKOdJq8R/5bz9KcxtCWfuR0L4/B5c04svs9nEPuU8AbEcbQkuuRdpqUhEzTjzTO7Q2c/xQRT4ObMYrsClITUs8ywvYzvxo3/ZnMAh4n/duiryXMAl4VWBw596asQe7pSFUIyK7sHuQ+lW7G8UTsxFsxDnxKukKmWYjsenzHcRyZFywEvfLwmQrd3RWwNn7K7bkF+IN0hUxzNX4PSHhLI9lOTACfk7YQkMWor8l+cC/knVwDwHbSFgIy0foJ2aRsVMnUkTvp3OlSdAaRTnlXIe/opOnOpciMbKpCQBpDPsNNyElk+aDQDAG7SVcIyLrMIdyk3KqUY2bWIesIKQoB2dpdnqC3TStBH1J/GP+NdBZyUC07T+YAz5KmEIAn6SxlgVp2nlSADdpJeDJI55bcm9WyKykraS9kk15q5eV5Wgt5QTGv0jLGzLPGZA/svcJWWs9rDSnmVVouonUL7tKefKBXwTmEHEuaMWFCdNja4ufzTYgO7wPfNPn5vMI/rKuHmYtcm9RzVCMRQ7icmQf1j1UzKjkV4EfOFPK9HUP0mEJWFuuZbUJ0+bDh9YAJ0WVfw+sBlSyM/xmh4cAe5VF1RlvGal//QiYeDcMwDMMwDMMwDMMwjOb8B7T5oNqqo7gkAAAAAElFTkSuQmCC"/>
                                    </defs>
                                </svg>
                                <h3 class="buttons-comment answer">${this.EscapeHtml(targetAuthor)}</h3>
                            </div>
                            
                        </div>
                        <h5 class="restrictions">Макс. 1000 символов</h5>
                        <div class="textarea-wrapper">
                            <textarea class="input-comments" rows="1" placeholder="Введите текст ответа..."></textarea>
                        </div>
                    </div>
                    <div class="button-container">
                        <h5 class="limit-count">Слишком длинное сообщение</h5>
                        <button class="send-comments" disabled>Отправить ответ</button>
                    </div>
                </div>
            `;
        }

        let insertAfter = parentComment;
        let next = insertAfter.nextElementSibling;

        while (next && next instanceof HTMLElement && next.classList.contains('lvl-2-nesting')) {
            insertAfter = next;
            next = next.nextElementSibling;
        }

        insertAfter.insertAdjacentHTML('afterend', replyHtml);

        // Настройка поведения
        const newReplyBox = insertAfter.nextElementSibling as HTMLElement;
        const textarea = newReplyBox.querySelector('textarea') as HTMLTextAreaElement;
        const sendBtn = newReplyBox.querySelector('.send-comments') as HTMLButtonElement;
        const restrictions = newReplyBox.querySelector('.restrictions') as HTMLElement;
        const limitCount = newReplyBox.querySelector('.limit-count') as HTMLElement;

        if (this.replyToId === parentId) {
            textarea.value = this.replyDraftText;
        }

        const updateUI = () => {
            const text = textarea.value;
            const len = text.length;
            const isValid = len > 0 && len <= 1000;

            // Обновление ограничений
            if (len === 0) {
                restrictions.textContent = 'Макс. 1000 символов';
                restrictions.style.color = '#999999';
                limitCount.style.display = 'none';
            } else if (len > 1000) {
                restrictions.textContent = `${len}/1000`;
                restrictions.style.color = 'red';
                limitCount.style.display = 'block';
            } else {
                restrictions.textContent = `${len}/1000`;
                restrictions.style.color = '#999999';
                limitCount.style.display = 'none';
            }

            // Обновление кнопки
            sendBtn.disabled = !isValid;
            sendBtn.classList.toggle('active', isValid);

            const wrapper = textarea.parentElement as HTMLElement | null;
            if (!wrapper) return;

            textarea.style.height = 'auto';
            const scrollHeight = textarea.scrollHeight;
            const maxHeight = 225;
            let newHeight = scrollHeight;
            if (newHeight < 61) newHeight = 61;
            if (newHeight > maxHeight) {
                newHeight = maxHeight;
                textarea.classList.add('growing');
            } else {
                textarea.classList.remove('growing');
            }
            wrapper.style.height = newHeight + 'px';
            textarea.style.height = '100%';
            this.replyDraftText = text; 
        };

        if (this.replyToId === parentId) {
            textarea.value = this.replyDraftText;
            updateUI();
        }
        this.replyToId = parentId;
        textarea.addEventListener('input', () => {
            updateUI();
            this.replyDraftText = textarea.value;
        });
        
        sendBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const text = textarea.value.trim();
            if (text && text.length <= 1000) {
                this.SendReply(parentComment, text, newReplyBox);
            }
        });

        textarea.focus();
    }

    /// Отправка ответа на комментарий
    private SendReply(parentComment: HTMLElement, text: string, replyBox?: HTMLElement): void 
    {
        const avatarElem = document.getElementById("my-avatar") as HTMLImageElement | null;
        const avatarSrc = avatarElem?.src ?? '';
        const nameElem = document.getElementById("my-name") as HTMLElement | null;
        const name = nameElem?.textContent ?? 'Аноним';

        const now = new Date();
        const date = `${PadZero(now.getDate())}.${PadZero(now.getMonth() + 1)}.${now.getFullYear()} ${PadZero(now.getHours())}:${PadZero(now.getMinutes())}`;

        const parentId = parentComment.dataset.commentId;

        const parentAuthor = parentComment.querySelector('.name-commentator')?.textContent || 'Автор';

        const newComment: CommentData = {
            id: GenerateId(),
            ...(parentId && { parentId }), 
            ...(parentAuthor && { parentAuthor }),
            avatarSrc,
            name,
            text,
            date,
            rating: 0,
            hasVotedUp: false,
            hasVotedDown: false,
            isFavorite: false
        };

        const savedComments = this.GetSavedComments();
        savedComments.push(newComment);
        localStorage.setItem('comments', JSON.stringify(savedComments));

        const targetAuthor = parentComment.querySelector('.name-commentator')?.textContent || 'Автор';

        const commentHtml = this.BuildReplyCommentHtml(newComment, targetAuthor);

        if (replyBox && replyBox.parentNode) {
            replyBox.insertAdjacentHTML('beforebegin', commentHtml);
            replyBox.remove();
        } else {
            let insertAfter = parentComment;
            let next = insertAfter.nextElementSibling;
            while (next && next instanceof HTMLElement && next.classList.contains('lvl-2-nesting')) {
                insertAfter = next;
                next = next.nextElementSibling;
            }
            insertAfter.insertAdjacentHTML('afterend', commentHtml);
        }

        GetCountComments();
        this.replyToId = null;
        this.replyDraftText = '';
    }

    /// Обработчик голосов
    public HandleVote(commentId: string, action: 'up' | 'down'): void
    {
        const comments = this.GetSavedComments();
        let comment: CommentData | undefined = undefined;
        
        // Поиск комментария
        for (let i = 0; i < comments.length; i++) {
            if (comments[i]?.id === commentId) {
                comment = comments[i];
                break;
            }
        }
        if (!comment) return;
        
        if (action === 'up') {
            if (comment.hasVotedUp) {
                // Уже голосовал ЗА - снимаем голос (возврат к 0)
                comment.rating -= 1;
                comment.hasVotedUp = false;
            } else if (comment.hasVotedDown) {
                // Голосовал ПРОТИВ - меняем на ЗА (+2)
                comment.rating += 2;
                comment.hasVotedDown = false;
                comment.hasVotedUp = true;
            } else {
                // Не голосовал - добавляем ЗА
                comment.rating += 1;
                comment.hasVotedUp = true;
            }
        } else {
            if (comment.hasVotedDown) {
                // Уже голосовал ПРОТИВ - снимаем голос (возврат к 0)
                comment.rating += 1;
                comment.hasVotedDown = false;
            } else if (comment.hasVotedUp) {
                // Голосовал ЗА - меняем на ПРОТИВ (-2)
                comment.rating -= 2;
                comment.hasVotedUp = false;
                comment.hasVotedDown = true;
            } else {
                // Не голосовал - добавляем ПРОТИВ
                comment.rating -= 1;
                comment.hasVotedDown = true;
            }
        }
        
        // Сохранение и обновление UI
        localStorage.setItem('comments', JSON.stringify(comments));
        this.UpdateCommentInDOM(commentId, comment);
    }

    /// Обновление комментариев
    private UpdateCommentInDOM(commentId: string, comment: CommentData): void 
    {
        const el = document.querySelector(`.comment-block[data-comment-id="${commentId}"]`);
        if (!el) return;

        const ratingEl = el.querySelector('.rating-count') as HTMLElement;
        if (ratingEl) {
            ratingEl.textContent = String(comment.rating);
            ratingEl.className = 'rating-count';
            if (comment.hasVotedUp) ratingEl.classList.add('voted-up');
            if (comment.hasVotedDown) ratingEl.classList.add('voted-down');
        }
    }

    /// Избранное
    public ToggleFavorite(commentId: string): void 
    {
        const comments = this.GetSavedComments();
        let comment: CommentData | undefined = undefined;
        for (const c of comments) {
            if (c.id === commentId) {
                comment = c;
                break;
            }
        }
        
        if (!comment) return;

        comment.isFavorite = !comment.isFavorite;
        localStorage.setItem('comments', JSON.stringify(comments));

        this.UpdateFavoriteButtonInDOM(commentId, comment.isFavorite);
    }

    /// Обновить кнопку Избранное 
    private UpdateFavoriteButtonInDOM(commentId: string, isFavorite: boolean): void 
    {
        const block = document.querySelector(`.comment-block[data-comment-id="${commentId}"]`);
        if (!block) return;
        const button = block.querySelector('.add-favorites') as HTMLElement;
        if (!button) return;

        const svgContainer = button.querySelector('svg');
        const newSvg = this.GetFavoriteIconSvg(isFavorite);
        if (svgContainer && newSvg) {
            svgContainer.outerHTML = newSvg;
        }

        const textSpan = button.querySelector('.favorites-text') as HTMLElement | null;
        if (textSpan) {
            textSpan.textContent = this.GetFavoriteButtonText(isFavorite);
        }
    }

    private currentView: 'all' | 'favorites' = 'all';

    /// Показ всех комментариев
    public ShowAllComments(): void 
    {
        this.currentView = 'all';
        this.LoadCommentsFromStorage();
    }

    /// Показ избранных комментариев
    public ShowFavoriteComments(): void 
    {
        this.currentView = 'favorites';
        const comments = this.GetSavedComments().filter(c => c.isFavorite);
        if (!this.commentsContainer) return;

        const dynamicComments = this.commentsContainer.querySelectorAll('.comment-block');
        dynamicComments.forEach(el => el.remove());

        comments.forEach(comment => {
            const html = this.BuildRootCommentHtml({...comment, parentId: undefined, parentAuthor: undefined});
            this.commentsContainer!.insertAdjacentHTML('beforeend', html);
        });

        
    }

    /// Перестройка структуры формы ввода
    public RebuildInputForm(): void
    {
        const container = document.querySelector('.input-comments-container') as HTMLElement;
        if (!container) return;
        
        const currentText = this.inputElement?.value || '';
        const isButtonActive = this.sendButton?.sendButton?.classList.contains('active') || false;
        const limitCountElement = document.querySelector('.limit-count') as HTMLElement;
        const isLimitVisible = limitCountElement?.style.display === 'block';
        
        let newHtml = '';
        if (isDesktop()) {
            newHtml = `
            <img class="avatar" id="my-avatar" src="../images/KorbenDetka.png" width="61" height="61">
            <div class="input-container">
                <div class="input-information-container">
                    <h3 id="my-name" class="name-commentator">Илья Васильевич</h3>
                    <h5 class="restrictions">Макс. 1000 символов</h5>
                </div>
                <div class="textarea-wrapper">
                    <textarea id="input-comments" rows="1" placeholder="Введите текст сообщения...">${this.EscapeHtml(currentText)}</textarea>
                </div>
            </div>
            <div class="button-container">
                <h5 class="limit-count" style="display: ${isLimitVisible ? 'block' : 'none'};">Слишком длинное сообщение</h5>
                <button class="send-comments ${isButtonActive ? 'active' : ''}" ${isButtonActive ? '' : 'disabled'}>Отправить</button>
            </div>
            `;
        } else {
            newHtml = `
            <div class="img-name">
                <img class="avatar" id="my-avatar" src="../images/KorbenDetka.png" width="61" height="61">
                <h3 id="my-name" class="name-commentator">Илья Васильевич</h3>
            </div>
            <h5 class="restrictions">Макс. 1000 символов</h5>
            <div class="textarea-wrapper">
                <textarea id="input-comments" rows="1" placeholder="Введите текст сообщения...">${this.EscapeHtml(currentText)}</textarea>
            </div>
            <div class="button-container">
                <h5 class="limit-count" style="display: ${isLimitVisible ? 'block' : 'none'};">Слишком длинное сообщение</h5>
                <button class="send-comments ${isButtonActive ? 'active' : ''}" ${isButtonActive ? '' : 'disabled'}>Отправить</button>
            </div>
            `;
        }
        
        container.innerHTML = newHtml;
        this.inputElement = document.getElementById('input-comments') as HTMLTextAreaElement;
        this.restrictionsElement = container.querySelector('.restrictions') as HTMLElement;
        const newSendButton = container.querySelector('.send-comments') as HTMLButtonElement;
        
        this.inputElement?.removeEventListener('input', () => this.TypingText());
        this.inputElement?.addEventListener('input', () => this.TypingText());
        
        if (this.sendButton) {
            this.sendButton.sendButton = newSendButton;
            this.sendButton.OnClickButton();
        }
        
        this.CountLenghtSymbols();
        this.TypingText();
    }

    /// Инициализация фильтра
    public InitFilter(): void {
        this.filterButton = document.getElementById('filter-button');
        this.filterDropdown = document.getElementById('filter-dropdown');
        const filterArrow = document.getElementById('filter-arrow');
        
        if (!this.filterButton || !this.filterDropdown) return;
        
        this.filterButton.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).closest('.filter-arrow')) return;
            e.stopPropagation();
            this.filterDropdown?.classList.toggle('show');
            this.filterButton?.classList.toggle('active');
        });
        
        // Переключение порядка при клике на стрелку
        if (filterArrow) {
            filterArrow.addEventListener('click', (e) => {
                e.stopPropagation();
                this.currentOrder = this.currentOrder === 'asc' ? 'desc' : 'asc';
                this.UpdateArrowRotation();
                this.ApplyFilter();
            });
        }
        
        // Закрытие при клике вне
        document.addEventListener('click', (e) => {
            if (!this.filterButton?.contains(e.target as Node)) {
                this.filterDropdown?.classList.remove('show');
                this.filterButton?.classList.remove('active');
            }
        });
        
        // Выбор опции фильтра
        const options = this.filterDropdown.querySelectorAll('.filter-option');

        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const filter = (option as HTMLElement).dataset.filter;
                
                if (filter) {
                    this.currentFilter = filter;
                    
                    const filterTextSpan = option.querySelector('span:not(.filter-checkmark)');
                    if (filterTextSpan && this.filterButton) {
                        const buttonText = this.filterButton.querySelector('.filter-text') as HTMLElement;
                        if (buttonText) {
                            buttonText.textContent = filterTextSpan.textContent;
                        }
                    }
                    
                    // Обновляем галочки
                    options.forEach(opt => opt.classList.remove('active'));
                    option.classList.add('active');
                    
                    // Закрываем dropdown
                    this.filterDropdown?.classList.remove('show');
                    this.filterButton?.classList.remove('active');
                    
                    // Применяем сортировку
                    this.ApplyFilter();
                }
            });
        });

        // При инициализации ставим галочку на дефолтный пункт
        const defaultOption = this.filterDropdown.querySelector(
            `.filter-option[data-filter="${this.currentFilter}"]`
        );
        if (defaultOption) {
            defaultOption.classList.add('active');
        }
        
        // Инициализация стрелки
        this.UpdateArrowRotation();
    }

    /// Новый метод для обновления вращения стрелки
    private UpdateArrowRotation(): void {
        const filterArrow = document.getElementById('filter-arrow');
        if (filterArrow) {
            if (this.currentOrder === 'desc') {
                filterArrow.style.transform = 'rotate(180deg)';
            } else {
                filterArrow.style.transform = 'rotate(0deg)';
            }
        }
    }

    /// Метод применения фильтра
    public ApplyFilter(): void {
        const comments = this.GetSavedComments();
        let sortedComments: CommentData[] = [...comments];
        
        // Сортировка
        switch (this.currentFilter) {
            case 'date':
                sortedComments.sort((a, b) => {
                    const dateA = this.ParseDate(a.date);
                    const dateB = this.ParseDate(b.date);
                    return this.currentOrder === 'asc' ? dateA - dateB : dateB - dateA;
                });
                break;
                
            case 'rating':
                sortedComments.sort((a, b) => {
                    return this.currentOrder === 'asc' ? a.rating - b.rating : b.rating - a.rating;
                });
                break;
                
            case 'relevance':
                // Актуальность = комбинация рейтинга и даты
                sortedComments.sort((a, b) => {
                    const dateA = this.ParseDate(a.date);
                    const dateB = this.ParseDate(b.date);
                    const now = Date.now();
                    const ageA = now - dateA;
                    const ageB = now - dateB;
                    const scoreA = a.rating * 1000000 - ageA;
                    const scoreB = b.rating * 1000000 - ageB;
                    return this.currentOrder === 'asc' ? scoreA - scoreB : scoreB - scoreA;
                });
                break;
                
            case 'replies':
                const replyCounts: { [key: string]: number } = {};
                comments.forEach(c => {
                    if (c.parentId) {
                        replyCounts[c.parentId] = (replyCounts[c.parentId] || 0) + 1;
                    }
                });
                sortedComments.sort((a, b) => {
                    const countA = replyCounts[a.id] || 0;
                    const countB = replyCounts[b.id] || 0;
                    return this.currentOrder === 'asc' ? countA - countB : countB - countA;
                });
        }
        
        // Перерисовка комментариев
        this.RenderSortedComments(sortedComments);
    }

    /// Парсинг даты из строки
    private ParseDate(dateStr: string): number {
        if (!dateStr) return 0;
        
        const parts = dateStr.split(' ');
        const date = parts[0];
        const time = parts[1];
        
        if (!date || !time) return 0;
        
        const dateParts = date.split('.');
        const day = parseInt(dateParts[0] || '0', 10) || 0;
        const month = parseInt(dateParts[1] || '0', 10) || 0;
        const year = parseInt(dateParts[2] || '0', 10) || 0;
        
        const timeParts = time.split(':');
        const hours = parseInt(timeParts[0] || '0', 10) || 0;
        const minutes = parseInt(timeParts[1] || '0', 10) || 0;
        
        return new Date(year, month - 1, day, hours, minutes).getTime();
    }

    /// Отрисовка отсортированных комментариев
    private RenderSortedComments(comments: CommentData[]): void {
        if (!this.commentsContainer) return;
        
        // Очистка
        const dynamicComments = this.commentsContainer.querySelectorAll('.comment-block');
        dynamicComments.forEach(el => el.remove());
        
        // Разделение на корневые и ответы
        const roots = comments.filter(c => !c.parentId);
        const replies = comments.filter(c => c.parentId);
        
        // Отрисовка корневых
        roots.forEach(comment => {
            this.commentsContainer!.insertAdjacentHTML('beforeend', this.BuildRootCommentHtml(comment));
        });
        
        // Отрисовка ответов
        replies.forEach(reply => {
            const parentEl = this.commentsContainer!.querySelector(`[data-comment-id="${reply.parentId}"]`);
            if (parentEl) {
                let insertAfter = parentEl;
                let next = insertAfter.nextElementSibling;
                while (next && next instanceof HTMLElement && next.classList.contains('lvl-2-nesting')) {
                    insertAfter = next;
                    next = next.nextElementSibling;
                }
                insertAfter.insertAdjacentHTML('afterend', this.BuildReplyCommentHtml(reply, reply.parentAuthor || 'Автор'));
            }
        });
        
        GetCountComments();
    }
}

class Button
{
    sendButton: HTMLElement | null;
    input: Input;
    
    constructor(input: Input)
    {
        this.sendButton = document.querySelector(".send-comments");
        this.input = input;
        this.OnClickButton();
    }
    
    public OnClickButton(): void
    {
        if (this.sendButton) {
            const newButton = this.sendButton.cloneNode(true) as HTMLElement;
            this.sendButton.parentNode?.replaceChild(newButton, this.sendButton);
            this.sendButton = newButton;
            
            this.sendButton.addEventListener('click', () => {
                this.input.SendComment();
                this.input.OnReset();
                this.ChangeStateButton(false);
            });
        }
    }
    
    public ChangeStateButton(isActive: boolean): void
    {
        if (this.sendButton) {
            this.sendButton.classList.toggle('active', isActive);
            (this.sendButton as HTMLButtonElement).disabled = !isActive;
        }
    }
}