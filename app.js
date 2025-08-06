/*
 * Simple HTTP server to output some data.
 */
const   http        = require('http'),
        path        = require('path'),
        os          = require('os'), 
        fs          = require('fs'), 
        uuid        = require('uuid'),
        colour      = require('randomcolor'),
        Handlebars  = require('handlebars'),
        dayjs       = require('dayjs'),
        utc         = require('dayjs/plugin/utc'),
        duration    = require('dayjs/plugin/duration'),
        DatabaseTester = require('./lib/database-tester'),
        port        = process.env.PORT || 3000;

// Configure dayjs plugins
dayjs.extend(utc);
dayjs.extend(duration);
        

class HelloWorldServer {
    
    constructor () {

      let previousMTime = new Date(0);
      
      this.index = path.resolve(__dirname, 'files/index.htm');

      fs.watch(this.index, async (event, filename) => {
        if (filename) {
          const stats = fs.statSync(this.index);
          if (stats.mtime.valueOf() === previousMTime.valueOf()) {
            return;
          }
          previousMTime = stats.mtime;
          console.log(`${filename} file Changed`);
          await this.loadContent ();
        }
      });
        
      this.startTime  = new Date().getTime(); 
      this.instance   = uuid.v4();
      this.colour     = colour();
      this.dbTester   = new DatabaseTester();
      this.server     = this.startServer();
      
      //
      this.server.listen(port, async (err) => {
        await this.loadContent();
        if (err) {
          return console.error(`hello-world raised an exception: ${err}`);
        }
        console.log(`hello-world is listening on port ${port}`)
      });
    }

    loadContent () {

      return new Promise((resolve, reject)=>{
        this.html       = fs.readFileSync(this.index, 'utf8'); 
        this.template   = Handlebars.compile(this.html);

        resolve();
      });
    }
    
    startServer() {
      let server = http.createServer((request, response) => {
        // Parse the request URL
        const url = new URL(request.url, `http://${request.headers.host}`);
        const pathname = url.pathname;
        const hostname = os.hostname();
        const instance = this.instance;

        // Define routes
        if (pathname === '/state/kill') {
            // Handle /state/kill route
            // You can add logic here to gracefully shut down your server
            response.writeHead(200, {'Content-Type': 'text/plain'});
            response.end('Shutting down server...');
            //
            console.log(`Shutting down server ${hostname} / ${instance} from kill request...`);
            // send a SIGINT to the process
            process.kill(process.pid, 'SIGINT');

        } else if (pathname === '/api') {
            // Handle /api route - return JSON status
            const apiData = {
                platform: os.platform(),
                hostname,
                instance,
                colour: this.colour,
                environment: this.getEnvironmentObject(),
                databases: this.dbTester.getConnectionStatus(),
                localTime: dayjs().format(),
                utcTime: dayjs.utc().format(),
                uptime: this.getUptime(),
                startTime: this.startTime
            };
            
            response.writeHead(200, {'Content-Type': 'application/json'});
            response.end(JSON.stringify(apiData, null, 2));

        } else {
            // Default route
            let data = {
                platform:   os.platform(),
                hostname,
                instance,
                colour:     this.colour,
                env:        this.getEnvironment(),
                databases:  this.dbTester.getFormattedStatus(),
                localTime:  dayjs().format(),
                utcTime:    dayjs.utc().format(),
                uptime:     this.getUptime()
            };
            let html = this.template(data);
            
            response.writeHead(200, {'Content-Type': 'text/html'});
            response.write(html);
            response.end();
        }
      });
    
      return server;
    }
    
    getUptime () {
        
      let now  = new Date().getTime();
      return dayjs.duration(now - this.startTime).humanize();
    }
    
    getEnvironment () {
        
      let keys = Object.keys(process.env);
      return keys.sort((a, b)=>{
          return a.localeCompare(b);
        }).map((e)=>{
          let value = process.env[e];
          // Mask password fields - keep first 4 and last 2 chars, star out the middle
          if (e.includes('_PASSWORD')) {
            if (value && value.length > 6) {
              const first4 = value.substring(0, 4);
              const last2 = value.substring(value.length - 2);
              const starCount = value.length - 6;
              value = first4 + '*'.repeat(starCount) + last2;
            }
          }
          return `<strong>${e}</strong>: ${value}`;
        }).join('\n');
    }

    getEnvironmentObject () {
      let keys = Object.keys(process.env);
      let env = {};
      keys.sort((a, b)=>{
          return a.localeCompare(b);
        }).forEach((e)=>{
          let value = process.env[e];
          // Mask password fields - keep first 4 and last 2 chars, star out the middle
          if (e.includes('_PASSWORD')) {
            if (value && value.length > 6) {
              const first4 = value.substring(0, 4);
              const last2 = value.substring(value.length - 2);
              const starCount = value.length - 6;
              value = first4 + '*'.repeat(starCount) + last2;
            }
          }
          env[e] = value;
        });
      return env;
    }
}

// handle SIGINT properly
process.on('SIGINT', async function() {
  console.log('Shutting down gracefully...');
  const server = global.helloWorldServer;
  if (server && server.dbTester) {
    await server.dbTester.cleanup();
  }
  process.exit();
});

global.helloWorldServer = new HelloWorldServer();
