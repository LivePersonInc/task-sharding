const Events = require('events');
const Zoologist = require('zoologist').Zoologist;
const ServiceInstanceBuilder = require('zoologist').ServiceInstanceBuilder;
const ServiceDiscoveryBuilder = require('zoologist').ServiceDiscoveryBuilder;

class ClusterMonitor extends Events {
    constructor(conf) {
        super();
        this.serviceName = conf.serviceName || 'my/service/name/v1';
        const zoologistClient = Zoologist.newClient(conf.zkConnectionString);
        zoologistClient.start();
        this.serviceInstance = ServiceInstanceBuilder.builder().name(this.serviceName).build();
        this.serviceDiscovery = ServiceDiscoveryBuilder.builder()
            .client(zoologistClient).basePath(conf.basePath || 'services')
            .thisInstance(this.serviceInstance).build();
        this.serviceDiscovery.registerService(() => {
            this._watcher((instance, list) => this.emit('clusterChange', instance, list));
        });
    }

    _watcher(callback) {
        const absPath = [this.serviceDiscovery.basePath, this.serviceName].join('/');
        this.serviceDiscovery.client.getClientwithConnectionCheck().getChildren(absPath, () => {
            this._watcher(callback);
        }, (err, serviceList) => {
            callback(this.serviceInstance.data.id, serviceList);
        });
    }
}

module.exports = ClusterMonitor;
