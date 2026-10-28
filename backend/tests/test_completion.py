"""Stopping-policy acceptance; presentation cannot change verifier output."""
import asyncio
import copy

import pytest
from forge.industrial.investigation import InvestigationRequest, investigate, render, replay
from forge.industrial.model import Recipe
from forge.industrial.presentation import progress
from forge.phase3.service import PRESETS, run


def test_bearing_stops_after_two_without_filling_the_four_test_allowance():
    result = investigate(InvestigationRequest(recipe=Recipe(scenario="bearing"), experiments=2))
    more = investigate(InvestigationRequest(recipe=Recipe(scenario="bearing"), experiments=4))
    assert result["decision"]["status"] == "SUPPORTED_SYNTHETIC"
    assert result["plan"] is None and len(result["trials"]) == 2
    assert more["trials"] == result["trials"] and more["events"] == result["events"]
    assert more["decision"] == result["decision"]
    assert progress(result)["remaining"] == progress(result)["not_needed"] == 2
    snapshot = copy.deepcopy(result)
    assert "2 of 4 permitted tests" in render(result)
    assert result == snapshot == replay(result)


@pytest.mark.parametrize("scenario,status,code",[("normal","SUPPORTED_SYNTHETIC","supported"),("bearing","IN_PROGRESS","continue"),("misalignment","INCONCLUSIVE","exhausted"),("cavitation","INCONCLUSIVE","inconclusive")])
def test_actual_stopping_states(scenario,status,code):
    result=investigate(InvestigationRequest(recipe=Recipe(scenario=scenario),experiments=1 if scenario=="bearing" else 4))
    assert result["decision"]["status"]==status
    assert progress(result)["code"]==code
    assert replay(result)==result


def test_exhausted_and_invalid_presentation_never_creates_an_experiment():
    # A real retained confounded case reaches its four-test budget inconclusively.
    session=asyncio.run(run(PRESETS["confounded"][1]))
    assert session.decision.status=="INCONCLUSIVE" and len(session.trials)==4
    view={"decision":session.decision.model_dump(),"trials":session.trials,"plan":None}
    assert progress(view)["code"]=="exhausted" and progress(view)["remaining"]==0
    invalid={**view,"plan":{"kind":"reference_check"}}
    assert progress(invalid)["code"]=="invalid"
    assert len(session.trials)==4
