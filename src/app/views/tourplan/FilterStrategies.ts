import {TourplanItem} from "../../classes/TourplanItem";
import {Cargotype} from "../../common/interfaces";

export abstract class FilterStrategy {
  selected = false;

  abstract name(white?: boolean): string;

  abstract passesFilter(tpi: TourplanItem): boolean;
}

export class FilterOpenJobs extends FilterStrategy {
  override name(): string {
    return 'offene touren';
  };

  override passesFilter(tpi: TourplanItem): boolean {
    return !tpi.isNote && !tpi._messenger;
  }
}

export class FilterCashJobs extends FilterStrategy {
  override name(): string {
    return 'bartouren';
  };

  override passesFilter(tpi: TourplanItem): boolean {
    return !tpi.isNote && !tpi._billingTour;
  }
}

export class FilterPrePlannedJobs extends FilterStrategy {
  override name(): string {
    return 'geplante touren';
  };

  override passesFilter(tpi: TourplanItem): boolean {
    return tpi.isPrePlanned;
  }
}

export class FilterCargoJobs extends FilterStrategy {
  override name(white?: boolean): string {
    return `<img src="../../../assets/cargo/last${white ? '_white' : ''}.png" alt="lastzuschlag" matTooltip="lastzuschlag" width="20px">`
  };

  override passesFilter(tpi: TourplanItem): boolean {
    return !tpi.isNote && tpi._job?.cargoType === Cargotype.cargo;
  }
}

export class FilterCargoBikeJobs extends FilterStrategy {
  override name(white?: boolean): string {
    return `<img src="../../../assets/cargo/lastenrad${white ? '_white' : ''}.png" alt="lastzuschlag" matTooltip="lastzuschlag" width="30px">`
  };

  override passesFilter(tpi: TourplanItem): boolean {
    return !tpi.isNote && tpi._job?.cargoType === Cargotype.cargoBike;
  }
}

export class FilterCarlaCargoJobs extends FilterStrategy {
  override name(white?: boolean): string {
    return `<img src="../../../assets/cargo/carla${white ? '_white' : ''}.png" alt="lastzuschlag" matTooltip="lastzuschlag" width="45px">`
  };

  override passesFilter(tpi: TourplanItem): boolean {
    return !tpi.isNote && tpi._job?.cargoType === Cargotype.carlaCargo;
  }
}

export class FilterAdhocJobs extends FilterStrategy {
  override name(): string {
    return 'ad-hoc-touren';
  };

  override passesFilter(tpi: TourplanItem): boolean {
    return !tpi.isRegularJob && !tpi.isPrePlanned && !tpi.isMorningTour;
  }
}

export class FilterRegularJobs extends FilterStrategy {
  override name(): string {
    return 'festtouren';
  };

  override passesFilter(tpi: TourplanItem): boolean {
    return tpi.isRegularJob || tpi.isMorningTour;
  }
}

export class FilterNotes extends FilterStrategy {
  override name(): string {
    return 'notizen';
  };

  override passesFilter(tpi: TourplanItem): boolean {
    return tpi.isNote;
  }
}
