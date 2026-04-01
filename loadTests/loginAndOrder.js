import { sleep, check, group, fail } from 'k6'
import http from 'k6/http'

export const options = {
    cloud: {
        distribution: { 'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 100 } },
        apm: [],
    },
    thresholds: {
        'checks': ['rate==1.0'],
        'http_req_duration': ['avg<300', 'p(95)<500'],
    },
    scenarios: {
        Scenario_1: {
            executor: 'ramping-vus',
            gracefulStop: '30s',
            stages: [
                { target: 5, duration: '30s' },
                { target: 15, duration: '1m' },
                { target: 5, duration: '2m' },
            ],
            gracefulRampDown: '30s',
            exec: 'scenario_1',
        },
    },
}

export function scenario_1() {
    const vars = {authtoken: "val", pizza_jwt: "pizza", order: {items: []}};
    let response

    group('page_3 - https://pizza.329ethanr.click/', function () {
        // Load Page
        response = http.get('https://pizza.329ethanr.click/', {
            headers: {
                Host: 'pizza.329ethanr.click',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'Sec-GPC': '1',
                Connection: 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
            },
        })
        sleep(4.8)

        // Login
        response = http.put(
            'https://pizza-service.329ethanr.click/api/auth',
            '{"email":"diner@jwt.com","password":"thisisthedinerpassword"}',
            {
                headers: {
                    Host: 'pizza-service.329ethanr.click',
                    Accept: '*/*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br, zstd',
                    'Content-Type': 'application/json',
                    Origin: 'https://pizza.329ethanr.click',
                    'Sec-GPC': '1',
                    Connection: 'keep-alive',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-site',
                    Priority: 'u=0',
                },
            }
        )
        if(!check(response, { 'status equals 200': response => response.status.toString() === '200' })){
            console.log(response.body);
            fail('Login was *not* 200')
        }
        vars.authtoken = response.json().token;

        sleep(12.2)

        // Menu
        response = http.get('https://pizza-service.329ethanr.click/api/order/menu', {
            headers: {
                Host: 'pizza-service.329ethanr.click',
                Accept: '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'Content-Type': 'application/json',
                Authorization:
                    `Bearer ${vars.authtoken}`,
                Origin: 'https://pizza.329ethanr.click',
                'Sec-GPC': '1',
                Connection: 'keep-alive',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-site',
                Priority: 'u=0',
                TE: 'trailers',
            },
        })

        // Franchises
        response = http.get(
            'https://pizza-service.329ethanr.click/api/franchise?page=0&limit=20&name=*',
            {
                headers: {
                    Host: 'pizza-service.329ethanr.click',
                    Accept: '*/*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br, zstd',
                    'Content-Type': 'application/json',
                    Authorization:
                        `Bearer ${vars.authtoken}`,
                    Origin: 'https://pizza.329ethanr.click',
                    'Sec-GPC': '1',
                    Connection: 'keep-alive',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-site',
                    Priority: 'u=4',
                    TE: 'trailers',
                },
            }
        )
        sleep(14.5)

        // User data
        response = http.get('https://pizza-service.329ethanr.click/api/user/me', {
            headers: {
                Host: 'pizza-service.329ethanr.click',
                Accept: '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'Content-Type': 'application/json',
                Authorization:
                    `Bearer ${vars.authtoken}`,
                Origin: 'https://pizza.329ethanr.click',
                'Sec-GPC': '1',
                Connection: 'keep-alive',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-site',
                Priority: 'u=0',
                TE: 'trailers',
            },
        })
        sleep(5.3)

        // Order
        response = http.post(
            'https://pizza-service.329ethanr.click/api/order',
            '{"items":[{"menuId":5,"description":"Charred Leopard","price":0.0099},{"menuId":3,"description":"Margarita","price":0.0042},{"menuId":1,"description":"Veggie","price":0.0038}],"storeId":"1","franchiseId":1}',
            {
                headers: {
                    Host: 'pizza-service.329ethanr.click',
                    Accept: '*/*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br, zstd',
                    'Content-Type': 'application/json',
                    Authorization:
                        `Bearer ${vars.authtoken}`,
                    Origin: 'https://pizza.329ethanr.click',
                    'Sec-GPC': '1',
                    Connection: 'keep-alive',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-site',
                    Priority: 'u=0',
                    TE: 'trailers',
                },
            }
        )
        if(!check(response, { 'status equals 200': response => response.status.toString() === '200' })){
            console.log(response.body);
            fail('Order response was *not* 200')
        }
        vars.pizza_jwt = response.json().jwt;
        vars.order = response.json().order;

        sleep(2.6)

        // Validate order
        response = http.post(
            'https://pizza-factory.cs329.click/api/order/verify',
            `{"jwt": "${vars.pizza_jwt}"}`,
            {
                headers: {
                    Host: 'pizza-factory.cs329.click',
                    Accept: '*/*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br, zstd',
                    'Content-Type': 'application/json',
                    Authorization:
                        `Bearer ${vars.authtoken}`,
                    Origin: 'https://pizza.329ethanr.click',
                    'Sec-Fetch-Storage-Access': 'none',
                    'Sec-GPC': '1',
                    Connection: 'keep-alive',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'cross-site',
                    Priority: 'u=0',
                },
            }
        )

        const payload = response.json().payload;
        const expectedItems = vars.order.items;
        const actualItems = payload.order.items;
        if (!check(response, {
            'vendor id matches': () => payload.vendor.id === 'etrush4',
            'diner id matches': () => payload.diner.id === 2,
            'order items match': () => expectedItems.length === actualItems.length &&
                expectedItems.every(expected => actualItems.some(actual =>
                    actual.menuId === expected.menuId &&
                    actual.description === expected.description &&
                    actual.price === expected.price
                )),
        })) {
            console.log(JSON.stringify(payload));
            console.log(JSON.stringify(vars.order));
            fail('JWT didn\'t match')
        }

        sleep(4.5)

        // Logout
        response = http.del('https://pizza-service.329ethanr.click/api/auth', null, {
            headers: {
                Host: 'pizza-service.329ethanr.click',
                Accept: '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'Content-Type': 'application/json',
                Authorization:
                    `Bearer ${vars.authtoken}`,
                Origin: 'https://pizza.329ethanr.click',
                'Sec-GPC': '1',
                Connection: 'keep-alive',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-site',
                Priority: 'u=0',
            },
        })
    })
}