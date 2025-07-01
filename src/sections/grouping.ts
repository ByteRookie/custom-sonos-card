import { css, html, LitElement, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { when } from 'lit/directives/when.js';
import MediaControlService from '../services/media-control-service';
import Store from '../model/store';
import { dispatchActivePlayerId, getGroupingChanges } from '../utils/utils';
import { listStyle } from '../constants';
import { MediaPlayer } from '../model/media-player';
import '../components/grouping-button';
import { CardConfig, PredefinedGroup, PredefinedGroupPlayer } from '../types';
import { GroupingItem } from '../model/grouping-item';

export class Grouping extends LitElement {
  @property({ attribute: false }) store!: Store;
  private groupingItems!: GroupingItem[];
  private activePlayer!: MediaPlayer;
  private mediaControlService!: MediaControlService;
  private mediaPlayerIds!: string[];
  private notJoinedPlayers!: string[];
  private joinedPlayers!: string[];
  @state() modifiedItems: string[] = [];
  @state() selectedPredefinedGroup?: PredefinedGroup;
  private config!: CardConfig;
  @state() private agsSwitchOn = false;

  render() {
    this.config = this.store.config;
    this.activePlayer = this.store.activePlayer;
    this.mediaControlService = this.store.mediaControlService;
    this.mediaPlayerIds = this.store.allMediaPlayers.map((player) => player.id);
    this.groupingItems = this.getGroupingItems();
    this.notJoinedPlayers = this.getNotJoinedPlayers();
    this.joinedPlayers = this.getJoinedPlayers();

    if (this.config.skipApplyButtonWhenGrouping && (this.modifiedItems.length > 0 || this.selectedPredefinedGroup)) {
      this.applyGrouping();
    }

    const agsSwitchState = this.config.agsSystemSwitch
      ? this.store.hass.states[this.config.agsSystemSwitch]?.state === 'on'
      : false;
    const agsStatusState = this.config.agsStatusSensor
      ? this.store.hass.states[this.config.agsStatusSensor]?.state === 'on'
      : false;
    this.agsSwitchOn = agsSwitchState;
    const agsActive = agsSwitchState || agsStatusState;

    return html`
      <div class="wrapper">
        <div class="predefined-groups">
          ${this.renderAgsSwitch(agsSwitchState)}
          ${agsActive
            ? nothing
            : html`${this.renderJoinAllButton()}
              ${this.renderUnJoinAllButton()}${when(this.store.predefinedGroups, () => this.renderPredefinedGroups())}`}
        </div>
        <div class="list">
          ${this.groupingItems.map((item) => {
            const roomSwitch = this.config.agsRoomSwitchPrefix
              ? `${this.config.agsRoomSwitchPrefix}${item.player.id.replace('media_player.', '')}`
              : '';
            const roomSwitchState = roomSwitch ? this.store.hass.states[roomSwitch]?.state === 'on' : false;
            return html`
              <div
                class="item"
                modified=${(!agsActive && item.isModified) || nothing}
                disabled=${(!agsActive && item.isDisabled) || nothing}
              >
                ${agsActive
                  ? html`<ha-switch
                      class="icon"
                      .checked=${roomSwitchState}
                      @change=${(ev: Event) => this.toggleRoomSwitch(ev, roomSwitch)}
                    ></ha-switch>`
                  : html`<ha-icon
                      class="icon"
                      selected=${item.isSelected || nothing}
                      .icon="mdi:${item.icon}"
                      @click=${() => this.toggleItem(item)}
                    ></ha-icon>`}
                <div class="name-and-volume">
                  <span class="name">${item.name}</span>
                  <sonos-volume
                    class="volume"
                    .store=${this.store}
                    .player=${item.player}
                    .updateMembers=${false}
                    .slim=${true}
                  ></sonos-volume>
                </div>
              </div>
            `;
          })}
        </div>
        <ha-control-button-group
          class="buttons"
          hide=${agsActive ||
          (this.modifiedItems.length === 0 && !this.selectedPredefinedGroup) ||
          this.config.skipApplyButtonWhenGrouping ||
          nothing}
        >
          <ha-control-button class="apply" @click=${this.applyGrouping}> Apply</ha-control-button>
          <ha-control-button @click=${this.cancelGrouping}> Cancel</ha-control-button>
        </ha-control-button-group>
      </div>
    `;
  }

  static get styles() {
    return [
      listStyle,
      css`
        :host {
          --mdc-icon-size: 24px;
        }
        .wrapper {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .predefined-groups {
          margin: 1rem;
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          justify-content: center;
          flex-shrink: 0;
        }

        .item {
          color: var(--secondary-text-color);
          padding: 0.5rem;
          display: flex;
          align-items: center;
        }

        .icon {
          padding-right: 0.5rem;
          flex-shrink: 0;
        }

        .icon[selected] {
          color: var(--accent-color);
        }

        .item[modified] .name {
          font-weight: bold;
          font-style: italic;
        }

        .item[disabled] .icon {
          color: var(--disabled-text-color);
        }

        .list {
          flex: 1;
          overflow: auto;
        }

        .buttons {
          flex-shrink: 0;
          margin: 0 1rem;
          padding-top: 0.5rem;
        }

        .apply {
          --control-button-background-color: var(--accent-color);
        }

        *[hide] {
          display: none;
        }

        .name-and-volume {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .volume {
          --accent-color: var(--secondary-text-color);
        }
      `,
    ];
  }

  toggleItem(item: GroupingItem) {
    if (item.isDisabled) {
      return;
    }
    this.toggleItemWithoutDisabledCheck(item);
  }

  private toggleItemWithoutDisabledCheck(item: GroupingItem) {
    if (this.modifiedItems.includes(item.player.id)) {
      this.modifiedItems = this.modifiedItems.filter((id) => id !== item.player.id);
    } else {
      this.modifiedItems = [...this.modifiedItems, item.player.id];
    }
    this.selectedPredefinedGroup = undefined;
  }

  private isAgsActive() {
    if (this.config.agsSystemSwitch) {
      return this.store.hass.states[this.config.agsSystemSwitch]?.state === 'on';
    }
    if (this.config.agsStatusSensor) {
      return this.store.hass.states[this.config.agsStatusSensor]?.state === 'on';
    }
    return false;
  }

  async applyGrouping() {
    const groupingItems = this.groupingItems;
    const joinedPlayers = this.joinedPlayers;
    const activePlayerId = this.activePlayer.id;
    const { unJoin, join, newMainPlayer } = getGroupingChanges(groupingItems, joinedPlayers, activePlayerId);
    this.modifiedItems = [];
    const selectedPredefinedGroup = this.selectedPredefinedGroup;
    this.selectedPredefinedGroup = undefined;
    if (this.isAgsActive()) {
      const prefix = this.config.agsRoomSwitchPrefix || '';
      for (const item of groupingItems) {
        const roomSwitch = `${prefix}${item.player.name.toLowerCase().replace(/\s+/g, '_')}`;
        const service = item.isSelected ? 'turn_on' : 'turn_off';
        await this.store.hass.callService('switch', service, { entity_id: roomSwitch });
      }
    } else {
      if (join.length > 0) {
        await this.mediaControlService.join(newMainPlayer, join);
      }
      if (unJoin.length > 0) {
        await this.mediaControlService.unJoin(unJoin);
      }
    }
    if (selectedPredefinedGroup) {
      await this.mediaControlService.setVolumeAndMediaForPredefinedGroup(selectedPredefinedGroup);
    }

    if (newMainPlayer !== activePlayerId && !this.config.dontSwitchPlayerWhenGrouping) {
      dispatchActivePlayerId(newMainPlayer, this.config, this);
    }
    if (this.config.entityId && unJoin.includes(this.config.entityId) && this.config.dontSwitchPlayerWhenGrouping) {
      dispatchActivePlayerId(this.config.entityId, this.config, this);
    }
  }

  private cancelGrouping() {
    this.modifiedItems = [];
  }

  private getGroupingItems() {
    const groupingItems = this.store.allMediaPlayers.map(
      (player) => new GroupingItem(player, this.activePlayer, this.modifiedItems.includes(player.id)),
    );
    const selectedItems = groupingItems.filter((item) => item.isSelected);
    if (selectedItems.length === 1) {
      selectedItems[0].isDisabled = true;
    }
    groupingItems.sort((a, b) => {
      if ((a.isMain && !b.isMain) || (a.isSelected && !b.isSelected)) {
        return -1;
      }
      return a.name.localeCompare(b.name);
    });

    return groupingItems;
  }

  private renderJoinAllButton() {
    const icon = this.config.groupingButtonIcons?.joinAll ?? 'mdi:checkbox-multiple-marked-outline';
    return when(this.notJoinedPlayers.length, () => this.groupingButton(icon, this.selectAll));
  }

  private groupingButton(icon: string, click: () => void) {
    return html` <sonos-grouping-button @click=${click} .icon=${icon}></sonos-grouping-button> `;
  }

  private getNotJoinedPlayers() {
    return this.mediaPlayerIds.filter(
      (playerId) => playerId !== this.activePlayer.id && !this.activePlayer.hasMember(playerId),
    );
  }

  private renderUnJoinAllButton() {
    const icon = this.config.groupingButtonIcons?.unJoinAll ?? 'mdi:minus-box-multiple-outline';
    return when(this.joinedPlayers.length, () => this.groupingButton(icon, this.deSelectAll));
  }

  private getJoinedPlayers() {
    return this.mediaPlayerIds.filter(
      (playerId) => playerId === this.activePlayer.id || this.activePlayer.hasMember(playerId),
    );
  }

  private renderPredefinedGroups() {
    return this.store.predefinedGroups.map((predefinedGroup) => {
      return html`
        <sonos-grouping-button
          @click=${async () => this.selectPredefinedGroup(predefinedGroup)}
          .icon=${this.config.groupingButtonIcons?.predefinedGroup ?? 'mdi:speaker-multiple'}
          .name=${predefinedGroup.name}
          .selected=${this.selectedPredefinedGroup?.name === predefinedGroup.name}
        ></sonos-grouping-button>
      `;
    });
  }

  private selectPredefinedGroup(predefinedGroup: PredefinedGroup<PredefinedGroupPlayer>) {
    this.groupingItems.forEach(async (item) => {
      const inPG = predefinedGroup.entities.some((pgp) => pgp.player.id === item.player.id);
      if ((inPG && !item.isSelected) || (!inPG && item.isSelected)) {
        this.toggleItemWithoutDisabledCheck(item);
      }
    });
    this.selectedPredefinedGroup = predefinedGroup;
  }

  private selectAll() {
    this.groupingItems.forEach((item) => {
      if (!item.isSelected) {
        this.toggleItem(item);
      }
    });
  }

  private deSelectAll() {
    this.groupingItems.forEach((item) => {
      if ((!item.isMain && item.isSelected) || (item.isMain && !item.isSelected)) {
        this.toggleItem(item);
      }
    });
  }

  private renderAgsSwitch(checked: boolean) {
    return this.config.agsSystemSwitch
      ? html`<ha-switch .checked=${checked} @change=${this.toggleAgsSystem}></ha-switch>`
      : nothing;
  }

  private async toggleAgsSystem(ev: Event) {
    if (!this.config.agsSystemSwitch) {
      return;
    }
    const checked = (ev.target as HTMLInputElement).checked;
    await this.store.hass.callService('switch', checked ? 'turn_on' : 'turn_off', {
      entity_id: this.config.agsSystemSwitch,
    });
  }

  private async toggleRoomSwitch(ev: Event, switchId: string) {
    if (!switchId) {
      return;
    }
    const checked = (ev.target as HTMLInputElement).checked;
    await this.store.hass.callService('switch', checked ? 'turn_on' : 'turn_off', {
      entity_id: switchId,
    });
  }
}
