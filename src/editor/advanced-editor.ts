import { html, TemplateResult } from 'lit';
import { BaseEditor } from './base-editor';

export const ADVANCED_SCHEMA = [
  {
    name: 'hideGroupCurrentTrack',
    selector: { boolean: {} },
  },
  {
    name: 'dynamicVolumeSlider',
    selector: { boolean: {} },
  },
  {
    name: 'dynamicVolumeSliderThreshold',
    type: 'integer',
    default: 20,
    required: true,
    valueMin: 1,
    valueMax: 100,
  },
  {
    name: 'dynamicVolumeSliderMax',
    type: 'integer',
    default: 30,
    required: true,
    valueMin: 1,
    valueMax: 100,
  },
  {
    name: 'artworkMinHeight',
    type: 'integer',
    help: 'Minimum height of the artwork in rem',
    default: 5,
    required: true,
    valueMin: 0,
  },
  {
    name: 'hideBrowseMediaButton',
    selector: { boolean: {} },
  },

  {
    name: 'labelWhenNoMediaIsSelected',
    type: 'string',
  },
  {
    name: 'labelForTheAllVolumesSlider',
    type: 'string',
  },
  {
    name: 'mediaBrowserTitle',
    type: 'string',
  },
  {
    name: 'queueTitle',
    type: 'string',
    cardType: 'sonos',
  },
  {
    name: 'artworkHostname',
    type: 'string',
  },
  {
    name: 'favoritesHideTitleForThumbnailIcons',
    selector: { boolean: {} },
  },
  {
    name: 'topFavorites',
    type: 'string',
  },
  {
    name: 'numberOfFavoritesToShow',
    type: 'integer',
    valueMin: 1,
  },
  {
    name: 'showAudioInputFormat',
    selector: { boolean: {} },
  },
  {
    name: 'adjustVolumeRelativeToMainPlayer',
    selector: { boolean: {} },
  },
  {
    name: 'skipApplyButtonWhenGrouping',
    selector: { boolean: {} },
  },
  {
    name: 'hideVolumeCogwheel',
    selector: { boolean: {} },
  },
  {
    name: 'artworkAsBackground',
    selector: { boolean: {} },
  },
  {
    name: 'playerVolumeEntityId',
    selector: { entity: { multiple: false, filter: { domain: 'media_player' } } },
  },
  {
    name: 'allowPlayerVolumeEntityOutsideOfGroup',
    selector: { boolean: {} },
  },
  {
    name: 'dontSwitchPlayerWhenGrouping',
    selector: { boolean: {} },
  },
  {
    name: 'showSourceInPlayer',
    selector: { boolean: {} },
  },
  {
    name: 'showChannelInPlayer',
    selector: { boolean: {} },
  },
  {
    name: 'hidePlaylistInPlayer',
    selector: { boolean: {} },
  },
  {
    name: 'fallbackArtwork',
    type: 'string',
    help: 'Override default fallback artwork image if artwork is missing for the currently selected media',
  },
  {
    name: 'entitiesToIgnoreVolumeLevelFor',
    help: 'If you want to ignore volume level for certain players in the player section',
    selector: { entity: { multiple: true, filter: { domain: 'media_player' } } },
  },
  {
    name: 'replaceHttpWithHttpsForThumbnails',
    selector: { boolean: {} },
  },
  {
    name: 'volumeStepSize',
    type: 'integer',
    valueMin: 1,
  },
  {
    name: 'showBrowseMediaInPlayerSection',
    selector: { boolean: {} },
  },
  {
    type: 'string',
    name: 'mediaTitleRegexToReplace',
  },
  {
    type: 'string',
    name: 'mediaTitleReplacement',
  },
  {
    name: 'footerHeight',
    type: 'integer',
    valueMin: 0,
  },
  {
    name: 'stopInsteadOfPause',
    selector: { boolean: {} },
  },
  {
    name: 'inverseGroupMuteState',
    selector: { boolean: {} },
  },
  {
    name: 'agsSystemSwitch',
    selector: { entity: { multiple: false, filter: { domain: 'switch' } } },
  },
  {
    name: 'agsStatusSensor',
    selector: { entity: { multiple: false, filter: { domain: 'sensor' } } },
  },
  {
    name: 'agsRoomSwitchPrefix',
    type: 'string',
  },
  {
    name: 'sortFavoritesByType',
    selector: { boolean: {} },
  },
];

class AdvancedEditor extends BaseEditor {
  protected render(): TemplateResult {
    const topFavorites = this.config.topFavorites ?? [];
    const data = { ...this.config, topFavorites: topFavorites.join(', ') };
    return html`
      <sonos-card-editor-form
        .schema=${ADVANCED_SCHEMA}
        .config=${this.config}
        .hass=${this.hass}
        .data=${data}
        .changed=${this.changed}
      ></sonos-card-editor-form>
      <div>
        The following needs to be configured using code (YAML):
        <ul>
          <li>customFavorites</li>
          <li>customFavoriteThumbnails</li>
          <li>customFavoriteThumbnailsIfMissing</li>
          <li>favoritesToIgnore</li>
          <li>groupingButtonIcons</li>
          <li>sectionButtonIcons</li>
        </ul>
      </div>
    `;
  }
  protected changed(ev: CustomEvent): void {
    const changed = ev.detail.value;
    this.config = {
      ...this.config,
      ...changed,
      topFavorites: changed.topFavorites.split(/ *, */),
    };
    this.configChanged();
  }
}

customElements.define('sonos-card-advanced-editor', AdvancedEditor);
