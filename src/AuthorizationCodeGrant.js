import Log from './Log';
import { AUTHORIZATION_FLOWS } from './Constants';
import AuthorizeState from './AuthorizationState';
import AuthorizationGrant from './AuthorizationGrant';
import UrlUtility from './UrlUtility';
import RedirectNavigator from './RedirectNavigator';

export default class AuthorizationCodeGrant extends AuthorizationGrant {
    constructor(config) {
        super(config);
        Log.debug('create AuthorizationCodeGrant');
    }

    async prepare() {
        this.url = await this.config.metadataService.getAuthorizationEndpoint();
        let requestParams = this.cleanRequest({
            response_type: 'code',
            redirect_uri: this.config._redirect_uri,
            client_id: this.config._client_id,
            scope: this.config._scope,
            display: this.config._display,
            prompt: this.config._prompt,
            max_age: this.config._max_age,
            ui_locales: this.config._ui_locales,
            id_token_hint: this.config._id_token_hint,
            login_hint: this.config._login_hint,
            acr_values: this.config._acr_values,
        });

        if (this.config.extraQueryParams) {
            Object.keys(this.config.extraQueryParams).map((key) => {
                requestParams[key] = this.config.extraQueryParams[key];
            });
        }

        if (!requestParams.redirect_uri) {
            Log.error('No redirect_uri passed to AuthorizationCodeGrant');
            throw new Error('_redirect_uri');
        }
        if (!requestParams.scope) {
            Log.error('No scope passed to AuthorizationCodeGrant');
            throw new Error('scope');
        }

        requestParams = await this.prepareState(requestParams);

        this.url = UrlUtility.buildRequestUrl(this.url, requestParams);
        Log.debug(`AuthorizationCodeGrant prepare url ${this.url}`);
    }

    async prepareState(requestParams) {
        let oidc = this.isOidc(requestParams.response_type);
        this.state = new AuthorizeState({
            nonce: oidc,
            client_id: requestParams.client_id,
            authority: this.config.authority,
            authorization_flow: AUTHORIZATION_FLOWS.AUTHORIZATION_CODE,
        });
        requestParams.nonce = this.state.nonce;
        requestParams.state = this.state.id;
        return requestParams;
    }

    async request() {
        try {
            await this.config.stateStore.set(
                this.state.id,
                this.state.toStorageString()
            );
            return RedirectNavigator.navigate(
                this.url,
                this.config.redirect_uri
            );
        } catch (err) {
            throw Error(`Navigating to ${this.url} failed.`);
        }
    }
}
