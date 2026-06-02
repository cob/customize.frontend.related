cob.custom.customize.push(function (core, utils, ui) {

    const KEYWORD = "$related"

    core.customizeAllInstances(async (instance, presenter) => {

        presenter.findFieldPs(childFp => childFp.getField().fieldDefinition.configuration.extensions[KEYWORD])
            .forEach(childFp => {
                const instanceField = childFp.getField();
                const confs = instanceField.fieldDefinition.configuration.extensions[KEYWORD]

                const fieldPHtml = childFp.content()[0]
                fieldPHtml.classList.add("related-field")
                fieldPHtml.innerHTML = "" +
                    "<div class=\"references-wrapper\">\n" +
                    "    <div class=\"references-legend\">\n" +
                    `        <span>${instanceField.fieldDefinition.name}</span> (<span class=\"js-total-records\">0</span>)\n` +
                    "        <div class=\"pull-right\">\n" +
                    "        <button class=\"js-references-refresh-btn references-btn references-refresh-btn\"><i class=\"icon-refresh\"></i></button>\n" +
                    "        </div>\n" +
                    "    </div>\n" +
                    `    <div id=\"f${instanceField.id}\" class='grid-results'></div>\n` +
                    "</div>\n" +
                    "<div class=\"js-references-new-wrapper references-new-wrapper\">\n" +
                    "</div>"

                if (!confs.args || confs.args.length <= 2) {
                    fieldPHtml.querySelector(".grid-results").innerHTML = "<p class='text-error'>Error parsing arguments of field</h4>";
                    return
                }

                const definition = confs.args[0]

                const queryFields = getFields(confs.args[1]);
                const query = buildQuery(confs.args[1], queryFields, presenter)
                const opts = buildOpts(confs.args[2] || "")

                const simpleSearch = new cob.components.SimpleSearch(core, `#f${instanceField.id}`, definition, query, {
                    activeVisualizationName: opts.view,
                    showViews: opts.showViews,
                    showActions: opts.showActions,
                    showImport: opts.showImport,
                    showCreateAndDelete: false,
                });

                if (!opts.showViews) {
                    fieldPHtml.classList.add("no-view-selection")
                }

                fieldPHtml.querySelector(".js-references-refresh-btn")
                    .addEventListener("click", simpleSearch.refresh)

                queryFields.forEach(fieldName => {
                    presenter.onFieldChange(fieldName, () => {
                        const newQuery = buildQuery(confs.args[1], queryFields, presenter)
                        simpleSearch.setSearchValue(newQuery)
                    })
                })

                setTimeout(() => {
                    updateTotalRecords(fieldPHtml)
                    registerObserver(fieldPHtml)
                }, 700)
            })
    })

    function getFields(query) {
        return [...query.matchAll(/__(.+?)__/g)].map(m => m[1]);
    }

    function buildQuery(query, queryFields, presenter,) {
        if (queryFields.length === 0) return query;

        const fieldValueMap = {}

        queryFields.forEach(f => {
            const matching = presenter.findFieldPs(fp => queryFields.includes(fp.getField().fieldDefinition.name))
            if (matching.length) {
                fieldValueMap[f] = matching[0].getValue()
            }
        })

        return query.replace(/__(.+?)__/g, (_, key) => fieldValueMap[key] ?? "*");
    }

    function buildOpts(opts) {
        if (!opts.startsWith('[') || !opts.endsWith(']')) {
            console.error('Invalid format: options should start and end with a [ and ]', opts);
            return {}
        }

        return opts.slice(1, -1)
            .split(/(?<!\\),/)
            .reduce((obj, pair) => {
                const [key, ...rest] = pair.split(':');
                obj[key.trim()] = rest.join(':').trim().replace(/\\,/g, ',');
                return obj;
            }, {});
    }

    function registerObserver(fieldPHtml) {
        const observer = new MutationObserver(() => {
            updateTotalRecords(fieldPHtml)
        });

        observer.observe(
            fieldPHtml.querySelector(".results-container .js-total-records"),
            {
                childList: true,
                characterData: true,
                subtree: true,
            }
        );
    }

    function updateTotalRecords(fieldPHtml) {
        // noinspection UnnecessaryLocalVariableJS
        const value = fieldPHtml.querySelector(".results-container .js-total-records").textContent
        fieldPHtml.querySelector(".references-legend .js-total-records").textContent = value
    }

});
