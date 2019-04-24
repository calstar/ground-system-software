function getDictionary() {
    return http.get('/dictionary.json')
        .then(function (result) {
            return result.data;
        });
}

var objectProvider = {
    get: function (identifier) {
        return getDictionary().then(function (dictionary) {
            if (identifier.key === 'rocket') {
                return {
                    identifier: identifier,
                    name: dictionary.name,
                    type: 'folder',
                    location: 'ROOT'
                };
            } else {
                var measurement = dictionary.measurements.filter(function (m) {
                    return m.key === identifier.key;
                })[0];
                return {
                    identifier: identifier,
                    name: measurement.name,
                    type: 'telemetry',
                    telemetry: {
                        values: measurement.values
                    },
                    location: 'taxonomy:rocket'
                };
            }
        });
    }
};

var compositionProvider = {
    appliesTo: function (domainObject) {
        return domainObject.identifier.namespace === 'taxonomy' &&
            domainObject.type === 'folder';
    },
    load: function (domainObject) {
        return getDictionary()
            .then(function (dictionary) {
                return dictionary.measurements.map(function (m) {
                    return {
                        namespace: 'taxonomy',
                        key: m.key
                    };
                });
            });
    }
};

function DictionaryPlugin() {
    return function install(openmct) {
        openmct.objects.addRoot({
            namespace: 'taxonomy',
            key: 'rocket'
        });
        openmct.objects.addProvider('taxonomy', objectProvider);
        openmct.composition.addProvider(compositionProvider);
        openmct.types.addType('telemetry', {
            name: 'Telemetry Point',
            description: 'A telemetry point.',
            cssClass: 'icon-telemetry'
        });
    };
};

