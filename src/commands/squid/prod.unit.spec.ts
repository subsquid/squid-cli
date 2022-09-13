import { inferProdUrl } from "./prod"

describe('Prod', () => {
    it('infers prod url', () => {
        expect(inferProdUrl('squid.devsquid.net/squid-template/v/v1/graphql', 'squid-template')).toEqual('https://squid.devsquid.net/squid-template/graphql')
        expect(inferProdUrl('https://squid.devsquid.net/squid-template/v/v1/graphql', 'squid-template')).toEqual('https://squid.devsquid.net/squid-template/graphql')
        expect(inferProdUrl('http://squid.devsquid.net/squid-template/v/v1/graphql', 'squid-template')).toEqual('https://squid.devsquid.net/squid-template/graphql')
    })
})