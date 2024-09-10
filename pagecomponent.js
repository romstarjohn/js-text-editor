

class PageComponent extends HTMLElement {
    constructor() {
        super();
        this.editors = [];
        const template = document.createElement('template');
        template.innerHTML = `
            <div class="dinA4">

            </div>
            `;
        this.appendChild(template.content.cloneNode(true));
        this.page = this.querySelector('.dinA4');

        // Style for the PageComponent
        const style = document.createElement('style');
        style.textContent = `
            .dinA4 {
                width: 210mm;
                height: 297mm;
                border: 1px solid black;
                padding: 20mm;
                margin: 20px auto;
                position: relative;
                box-sizing: border-box;
            }

            .text-editor {
                position: absolute;
                /* Anpassen je nach Bedarf */
                left: 25mm;
                right: 25mm;
                bottom: 45mm; /* Hinterlässt Platz für den Footer */
            }
        `;
        this.appendChild(style);
        this.pageIndex = 0;
        this._page_layout = null;
        this.addEventListener('contentSizeChange', this.handleContentSizeChange.bind(this));
        this.addEventListener('notifyUndoChange', this.handleEditorUndoChange.bind(this));
        this.addEventListener('editorSizeSmaller', this.handleEditorSizeChange.bind(this));
        this.addEventListener('pageStartReached', this.handlePageStartReached.bind(this));
        this.addEventListener('pageEndReached', this.handlePageEndReached.bind(this));

    }

    set page_layout(page_layout){
        this._page_layout = page_layout;
    }

    initPage(pageId) {
        this.pageIndex = pageId;
        if( this.pageIndex == 0 ) {
                this.page.innerHTML = this.generatePageContent(this._page_layout.first_page);
        } else {
            this.page.innerHTML = this.generatePageContent(this._page_layout.other_page);
        }


    }

    generatePageContent(page_config) {
        let innerHtml = "";
        page_config.forEach((component) => {
            switch (component.name) {
                case "letter-body":
                    innerHtml += '<div class="text-editor" style="';
                    for (const key in component.configuration) {
                        innerHtml += `${key}:${component.configuration[key]};`;
                    }
                    innerHtml += '"></div>';
                    break;
            }
        });
        return innerHtml;
    }

    getPageIndex(){
        return this.pageIndex;
    }

    isBodyEditorOverflowed() {
        return this.editors[0].isOverflowed();
    }

    getBodyEditorElt() {
        return this.editors[0].getEditorElt();
    }

    handleContentSizeChange(event) {
        this.notifyBriefComponent(event.detail.content, this.pageIndex);
    }

    handleEditorUndoChange(event) {
        this.notifyBriefComponentOnUndo(event.detail.content, this.pageIndex);
    }

    handleEditorSizeChange(event) {
        this.notifyBriefComponentSmaller( this.pageIndex);
    }

    handlePageStartReached(event) {
        this.notifyMoveCursorPreviousPage( this.pageIndex);
    }

    handlePageEndReached(event) {
        this.notifyMoveCursorNextPage( this.pageIndex);
    }

    notifyBriefComponentOnUndo(content, index) {
        const event = new CustomEvent('pageContentUndoChanged', { bubbles: true,
            detail: { content: content, index : index }});
        this.dispatchEvent(event);
    }

    notifyBriefComponentSmaller(index) {
        const event = new CustomEvent('pageContentSmaller', { bubbles: true,
            detail: {index : index }});
        this.dispatchEvent(event);
    }

    notifyMoveCursorPreviousPage(index) {
        const event = new CustomEvent('moveToPreviousPage', { bubbles: true,
            detail: {index : index }});
        this.dispatchEvent(event);
    }


    notifyMoveCursorNextPage(index) {
        const event = new CustomEvent('moveToNextPage', { bubbles: true,
            detail: {index : index }});
        this.dispatchEvent(event);
    }

    notifyBriefComponent(content, index) {
        const event = new CustomEvent('pageContentSizeChanged', { bubbles: true,
            detail: { content: content, index : index }});
        this.dispatchEvent(event);
    }

    getReturnAddress(){
        var element = this.querySelector('absender-field-component')
        if(element == undefined){
            return "";
        }
        return element.getHtmlContent();
    }

    getLetterSender(){
        var element = this.querySelector('absender-addresse-component')
        if(element == undefined){
            return "";
        }
        return element.getHtmlContent();
    }

    getLetterReceiver(){
        var element = this.querySelector('empfanger-addresse-component')
        if(element == undefined){
            return "";
        }
        return element.getHtmlContent();
    }

    getLetterMeta(){
        var element = this.querySelector('letter-meta-component')
        if(element == undefined){
            return "";
        }
        return element.getHtmlContent();
    }

    isBodyEditorEmpty(){
        return this.editors[0].isContentEmpty()
    }

    getEditorContent(){
        return this.editors[0].getHtmlContent();
    }

    connectedCallback() {
        // Initialization code here
        console.log('PageComponent added to the DOM');
    }

    disconnectedCallback() {
        console.log("Child Custom element removed from page.");
    }

    adoptedCallback() {
        console.log("Child Custom element moved to new page.");
    }

    attributeChangedCallback(name, oldValue, newValue) {

    }

    focusOnBodyEditorStart(){
        return this.editors[0].focusOnTextEditorStart();
    }

    focusOnBodyEditor(){
        return this.editors[0].focusOnTextEditor();
    }

    updateEditorContent(content){
        var editorContent = this.editors[0].getHtmlContent();
        editorContent += content;
        this.editors[0].updateEditor(editorContent);
    }

    registerEditor(editor) {
        const text = this.querySelector('.text-editor');
        this.editors.push(editor);
        text.appendChild(editor)
        this.page.appendChild(text);
    }

    unregisterEditor(editor) {
        // Remove editor from the PageComponent
        const index = this.editors.indexOf(editor);
        if (index > -1) {
            this.editors.splice(index, 1);
            this.page.removeChild(editor);
        }
    }
    // Additional PageComponent methods
}

customElements.define('page-component', PageComponent);
