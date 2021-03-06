import Log from './Log';
import { AUTHORIZATION_FLOWS } from './Constants';
import AuthorizeState from './AuthorizationState';
import AuthorizationGrant from './AuthorizationGrant';
import UrlUtility from './UrlUtility';
import RedirectNavigator from './RedirectNavigator';

export default class ImplicitGrant extends AuthorizationGrant {
    constructor(config) {
        super(config);
        Log.debug('create ImplicitGrant');
    }

    async prepare() {
        this.url = await this.config.metadataService.getAuthorizationEndpoint();
        const requestParams = this.cleanRequest({
            response_type: 'id_token token',
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
            Log.error('No redirect_uri passed to ImplicitGrant');
            throw new Error('_redirect_uri');
        }
        if (!requestParams.scope) {
            Log.error('No scope passed to ImplicitGrant');
            throw new Error('scope');
        }

        let oidc = this.isOidc(requestParams.response_type);
        this.state = new AuthorizeState({
            nonce: oidc,
            client_id: requestParams.client_id,
            authority: this.config.authority,
            authorization_flow: AUTHORIZATION_FLOWS.IMPLICIT,
        });

        requestParams.nonce = this.state.nonce;
        requestParams.state = this.state.id;

        this.url = UrlUtility.buildRequestUrl(this.url, requestParams);
        Log.debug(`ImplicitGrant prepare url ${this.url}`);
    }

    async request() {
        try {
            await this.config.stateStore.set(
                this.state.id,
                this.state.toStorageString()
            );
            return RedirectNavigator.navigate(this.url);
        } catch (err) {
            throw Error(`Navigating to ${this.url} failed.`);
        }
    }
}
