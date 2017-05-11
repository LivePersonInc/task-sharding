const Events = require('events');
const Zoologist = require('zoologist').Zoologist;
const ZKEvent = require('node-zookeeper-client').Event;
const ServiceInstanceBuilder = require('zoologist').ServiceInstanceBuilder;
const ServiceDiscoveryBuilder = require('zoologist').ServiceDiscoveryBuilder;

class ClusterMonitor extends Events {
    constructor(conf) {
        super();
        this.serviceName = conf.serviceName;
        const zoologistClient = Zoologist.newClient(conf.zkConnectionString);
        zoologistClient.start();
        this.serviceInstance = ServiceInstanceBuilder.builder().name(this.serviceName).build();
        this.serviceDiscovery = ServiceDiscoveryBuilder.builder()
            .client(zoologistClient).basePath(conf.basePath || 'services')
            .thisInstance(this.serviceInstance).build();

        this.serviceDiscovery.registerService(() => {
            this.emit('node-id',this.serviceInstance.data.id);
            this._watcher();
        });
    }

    _watcher() {
        const absPath = [this.serviceDiscovery.basePath, this.serviceName].join('/');
        this.serviceDiscovery.client.getClientwithConnectionCheck().getChildren(absPath, (event) => {
            // this.serviceDiscovery.queryForInstances(this.serviceName, onNodeList);
            this._watcher(); //Listener only called once, query & rebind.
        }, (err, serviceList) => {
            if(err) {
                return this.emit('error',err);
            }
            this.emit('node-list',serviceList);
        });
    }
}

module.exports = ClusterMonitor;
