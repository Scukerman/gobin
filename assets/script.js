hljs.listLanguages().forEach((language) => {
    const option = document.createElement("option");
    option.value = language;
    option.innerText = language;

    const languageElement = document.querySelector("#language")
    if (languageElement.value === language) {
        languageElement.removeChild(languageElement.querySelector(`option[value="${language}"]`));
        option.selected = true;
    }

    languageElement.appendChild(option);
});

document.addEventListener("DOMContentLoaded", async () => {
    const key = window.location.pathname === "/" ? "" : window.location.pathname.slice(1);
    const version = window.location.hash === "" ? 0 : parseInt(window.location.hash.slice(1));
    const params = new URLSearchParams(window.location.search);
    if (params.has("token")) {
        setUpdateToken(key, params.get("token"));
    }

    document.querySelector("#nav-btn").checked = false;
    document.querySelector("#versions-btn").checked = false;

    let content = "", language = "";
    if (key) {
        if (version) {
            const {newState} = await fetchVersion(key, version);
            content = newState.content;
            language = newState.language;
        } else {
            content = document.querySelector("#code-view").innerText;
            language = document.querySelector("#language").value;
        }
    }
    const {newState, url} = createState(key, version, key ? "view" : "edit", content, language);
    updateCode(newState);
    updatePage(newState);
    window.history.replaceState(newState, "", url);
});

window.addEventListener("popstate", (event) => {
    updateCode(event.state);
    updatePage(event.state);
});

document.querySelector("#code-edit").addEventListener("keydown", (event) => {
    if (event.key !== "Tab" || event.shiftKey) {
        return;
    }
    event.preventDefault();

    const start = event.target.selectionStart;
    const end = event.target.selectionEnd;
    event.target.value = event.target.value.substring(0, start) + "\t" + event.target.value.substring(end);
    event.target.selectionStart = event.target.selectionEnd = start + 1;
});

document.querySelector("#code-edit").addEventListener("paste", (event) => {
    event.preventDefault();
    const codeEditElement = document.querySelector("#code-edit");
    const {key, version, language} = getState();
    const newContent = codeEditElement.value + event.clipboardData.getData("text/plain");
    const {newState, url} = createState(key, version, "edit", newContent, language);
    updatePage(newState);
    codeEditElement.value = newContent;
    window.history.replaceState(newState, "", url);
})

document.addEventListener("keydown", (event) => {
    if (!event.ctrlKey || !["s", "n", "e", "d"].includes(event.key)) return;
    doKeyboardAction(event, event.key);
})

const doKeyboardAction = (event, elementName) => {
    event.preventDefault();
    if (document.querySelector(`#${elementName}`).disabled) return;
    document.querySelector(`#${elementName}`).click();
}

document.querySelector("#code-edit").addEventListener("keyup", (event) => {
    const {key, version, language} = getState();
    const {newState, url} = createState(key, version, "edit", event.target.value, language);
    updatePage(newState);
    window.history.replaceState(newState, "", url);
})

document.querySelector("#edit").addEventListener("click", async () => {
    if (document.querySelector("#edit").disabled) return;

    const {key, version, content, language} = getState();
    const {newState, url} = createState(getUpdateToken(key) === "" ? "" : key, 0, "edit", content, language);
    updateCode(newState);
    updatePage(newState);
    window.history.pushState(newState, "", url);
})

document.querySelector("#save").addEventListener("click", async () => {
    if (document.querySelector("#save").disabled) return;
    const {key, mode, content, language} = getState()
    if (mode !== "edit") return;
    const updateToken = getUpdateToken(key);
    const saveButton = document.querySelector("#save");
    saveButton.classList.add("loading");

    let response;
    if (key && updateToken) {
        response = await fetch(`/documents/${key}`, {
            method: "PATCH",
            body: content,
            headers: {
                Authorization: updateToken,
                Language: language
            }
        });
    } else {
        response = await fetch("/documents", {
            method: "POST",
            body: content,
            headers: {
                Language: language
            }
        });
    }
    saveButton.classList.remove("loading");

    const body = await response.json();
    if (!response.ok) {
        showErrorPopup(body.message || response.statusText);
        console.error("error saving document:", response);
        return;
    }

    const {newState, url} = createState(body.key, body.version, "view", content, language);
    setUpdateToken(body.key, body.update_token);

    const inputElement = document.createElement("input")
    const labelElement = document.createElement("label")

    inputElement.id = `version-${body.version}`;
    inputElement.classList.add("version-btn");
    inputElement.type = "radio";
    inputElement.name = "version";
    inputElement.value = body.version;
    inputElement.checked = true;

    labelElement.htmlFor = `version-${body.version}`;
    labelElement.classList.add("version");
    labelElement.title = `${body.version_time}`;
    labelElement.innerText = `${body.version_label}`;

    const versionsElement = document.querySelector("#versions")
    for (let child of versionsElement.children) {
        child.checked = false
    }
    versionsElement.insertBefore(labelElement, versionsElement.firstChild);
    versionsElement.insertBefore(inputElement, versionsElement.firstChild);

    updateCode(newState);
    updatePage(newState);
    window.history.pushState(newState, "", url);
});

document.querySelector("#delete").addEventListener("click", async () => {
    if (document.querySelector("#delete").disabled) return;

    const {key} = getState();
    const updateToken = getUpdateToken(key);
    if (updateToken === "") {
        return;
    }

    const deleteConfirm = window.confirm("Are you sure you want to delete this document? This action cannot be undone.")
    if (!deleteConfirm) return;

    const deleteButton = document.querySelector("#delete");
    deleteButton.classList.add("loading");
    let response = await fetch(`/documents/${key}`, {
        method: "DELETE",
        headers: {
            Authorization: updateToken
        }
    });
    deleteButton.classList.remove("loading");

    if (!response.ok) {
        const body = await response.json();
        showErrorPopup(body.message || response.statusText)
        console.error("error deleting document:", response);
        return;
    }
    deleteUpdateToken();
    const {newState, url} = createState("", 0, "edit", "", "");
    updateCode(newState);
    updatePage(newState);
    window.history.pushState(newState, "", url);
})

document.querySelector("#copy").addEventListener("click", async () => {
    if (document.querySelector("#copy").disabled) return;

    const {content} = getState();
    if (!content) return;
    await navigator.clipboard.writeText(content);
})

document.querySelector("#raw").addEventListener("click", () => {
    if (document.querySelector("#raw").disabled) return;

    const {key, version} = getState();
    if (!key) return;
    window.open(`/raw/${key}/versions/${version}`, "_blank").focus();
})

document.querySelector("#share").addEventListener("click", async () => {
    if (document.querySelector("#share").disabled) return;

    const {key} = getState();
    const updateToken = getUpdateToken(key);
    if (updateToken === "") {
        await navigator.clipboard.writeText(window.location.href);
        return;
    }

    document.querySelector("#share-permissions").checked = false;
    document.querySelector("#share-url").value = window.location.href;
    document.querySelector("#share-dialog").showModal();
});

document.querySelector("#share-dialog-close").addEventListener("click", () => {
    document.querySelector("#share-dialog").close();
});

document.querySelector("#share-permissions").addEventListener("change", (event) => {
    const {key} = getState();
    const updateToken = getUpdateToken(key);
    if (updateToken === "") {
        return;
    }

    const shareUrl = document.querySelector("#share-url");
    if (event.target.checked) {
        shareUrl.value = `${window.location.href}?token=${updateToken}`;
        return;
    }
    shareUrl.value = window.location.href;
});

document.querySelector("#share-url").addEventListener("click", () => {
    document.querySelector("#share-url").select();
});

document.querySelector("#share-copy").addEventListener("click", async () => {
    const shareUrl = document.querySelector("#share-url");
    await navigator.clipboard.writeText(shareUrl.value);
    document.querySelector("#share-dialog").close();
});


document.querySelector("#language").addEventListener("change", (event) => {
    const {key, version, mode, content} = getState();
    const {newState, url} = createState(key, version, mode, content, event.target.value);
    highlightCode(newState);
    window.history.replaceState(newState, "", url);
});

document.querySelector("#style").addEventListener("change", (event) => {
    setStyle(event.target.value);
});

document.querySelector("#versions").addEventListener("click", async (event) => {
    if (event.target && event.target.matches("input[type='radio']")) {
        const {key, version} = getState();
        let newVersion = event.target.value;
        if (event.target.parentElement.children.item(0).value === newVersion) {
            newVersion = ""
        }
        if (newVersion === version) return;
        const {newState, url} = await fetchVersion(key, newVersion)
        if (!newState) return;
        updateCode(newState);
        window.history.pushState(newState, "", url);
    }
})

async function fetchVersion(key, version) {
    const response = await fetch(`/documents/${key}${version ? `/versions/${version}` : ""}`, {
        method: "GET"
    });

    const body = await response.json();
    if (!response.ok) {
        showErrorPopup(body.message || response.statusText);
        console.error("error fetching document version:", response);
        return;
    }

    return createState(key, version, "view", body.data, body.language);
}

function showErrorPopup(message) {
    const popup = document.getElementById("error-popup");
    popup.style.display = "block";
    popup.innerText = message || "Something went wrong.";
    setTimeout(() => popup.style.display = "none", 5000);
}

function getState() {
    return window.history.state;
}

function createState(key, version, mode, content, language) {
    return {newState: {key, version, mode, content: content.trim(), language}, url: `/${key}${version ? `#${version}` : ""}`};
}

function getUpdateToken(key) {
    const documents = localStorage.getItem("documents")
    if (!documents) return ""
    const updateToken = JSON.parse(documents)[key]
    if (!updateToken) return ""

    return updateToken
}

function setUpdateToken(key, updateToken) {
    let documents = localStorage.getItem("documents")
    if (!documents) {
        documents = "{}"
    }
    const parsedDocuments = JSON.parse(documents)
    parsedDocuments[key] = updateToken
    localStorage.setItem("documents", JSON.stringify(parsedDocuments))
}

function deleteUpdateToken() {
    const {key} = getState();
    const documents = localStorage.getItem("documents");
    if (!documents) return;
    const parsedDocuments = JSON.parse(documents);
    delete parsedDocuments[key]
    localStorage.setItem("documents", JSON.stringify(parsedDocuments));
}

function updateCode(state) {
    const {mode, content} = state;

    const codeElement = document.querySelector("#code");
    const codeEditElement = document.querySelector("#code-edit");
    const codeViewElement = document.querySelector("#code-view");

    if (mode === "view") {
        codeEditElement.style.display = "none";
        codeEditElement.value = "";
        codeViewElement.innerText = content;
        codeElement.style.display = "block";
        highlightCode(state);
        return;
    }
    codeEditElement.value = content;
    codeEditElement.style.display = "block";
    codeViewElement.innerText = "";
    codeElement.style.display = "none";
}

function updatePage(state) {
    const {key, mode, content} = state;
    const updateToken = getUpdateToken(key);
    // update page title
    if (key) {
        document.title = `gobin - ${key}`;
    } else {
        document.title = "gobin";
    }

    const saveButton = document.querySelector("#save");
    const editButton = document.querySelector("#edit");
    const deleteButton = document.querySelector("#delete");
    const copyButton = document.querySelector("#copy");
    const rawButton = document.querySelector("#raw");
    const shareButton = document.querySelector("#share");
    const versionsButton = document.querySelector("#versions-btn");
    versionsButton.disabled = document.querySelector("#versions").children.length <= 2;
    if (mode === "view") {
        saveButton.disabled = true;
        saveButton.style.display = "none";
        editButton.disabled = false;
        editButton.style.display = "block";
        if (updateToken) {
            deleteButton.disabled = false;
        }
        copyButton.disabled = false;
        rawButton.disabled = false;
        shareButton.disabled = false;
        return
    }
    saveButton.disabled = content === "";
    saveButton.style.display = "block";
    editButton.disabled = true;
    editButton.style.display = "none";
    deleteButton.disabled = true;
    copyButton.disabled = true;
    rawButton.disabled = true;
    shareButton.disabled = true;
}

function highlightCode(state) {
    const {content, language} = state;
    let result;
    if (language && language !== "auto") {
        result = hljs.highlight(content, {
            language: language, ignoreIllegals: true
        });
    } else {
        result = hljs.highlightAuto(content);
    }
    if (result.language === undefined) {
        result.language = "plaintext";
    }

    if (result.language !== language) {
        state.language = result.language;
    }

    applyCodeLines(result)

    document.querySelector("#code-view").innerHTML = result.value;
    document.querySelector("#language").value = result.language;
}

function applyCodeLines(result) {
    const htmlLines = result.value.split('\n')
    let spanStack = []
    result.value = htmlLines.map((content, index) => {
        let startSpanIndex, endSpanIndex
        let needle = 0
        content = spanStack.join('') + content
        spanStack = []
        do {
            const remainingContent = content.slice(needle)
            startSpanIndex = remainingContent.indexOf('<span')
            endSpanIndex = remainingContent.indexOf('</span')
            if (startSpanIndex === -1 && endSpanIndex === -1) {
                break
            }
            if (endSpanIndex === -1 || (startSpanIndex !== -1 && startSpanIndex < endSpanIndex)) {
                const nextSpan = /<span .+?>/.exec(remainingContent)
                if (nextSpan === null) {
                    // never: but ensure no exception is raised if it happens some day.
                    break
                }
                spanStack.push(nextSpan[0])
                needle += startSpanIndex + nextSpan[0].length
            } else {
                spanStack.pop()
                needle += endSpanIndex + 1
            }
        } while (true)
        if (spanStack.length > 0) {
            content += Array(spanStack.length).fill('</span>').join('')
        }
        return `<div class="line">${content}\n</div>`
    }).join('')
}