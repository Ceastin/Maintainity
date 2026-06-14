---
equipment_id: rm-motor-01
source_type: manual
title: External Guidance: Rolling Bearing Damage Patterns
section: Lubrication, contamination, and vibration
source_url: https://evolution.skf.com/bearing-damage-analysis-iso-15243-is-here-to-help-you/
asset_focus: rolling mill motor bearings
failure_mode: bearing wear lubrication contamination vibration
maintenance_signal: temperature_c vibration_mm_s current_a
---
Bearing damage investigations should compare vibration, heat, lubrication condition, sealing, and contamination signs together. Rising vibration plus heat can point to lubricant film breakdown, particle contamination, shaft misalignment, or bearing race damage. For a rolling mill motor, treat repeated heat-vibration drift as a reason to inspect grease delivery, coupling alignment, seals, and bearing housings before restarting under high load.

---
equipment_id: rm-motor-01
source_type: sop
title: External Guidance: Electrical Maintenance Safety
section: De-energize before inspection
source_url: https://www.osha.gov/etools/electrical-contractors/supplemental-information/hazards
asset_focus: motor control and electrical safety
failure_mode: electrical repair safety lockout
maintenance_signal: current_a temperature_c
---
Before hands-on inspection or repair of motor electrical equipment, qualified staff should de-energize the asset, apply lockout/tagout, verify isolation, and use suitable protective equipment. For this dashboard, current spike and thermal alarms should therefore produce a plan that separates online monitoring from physical maintenance work, with isolation required before opening panels or touching the drive.

---
equipment_id: bf-pump-07
source_type: manual
title: External Guidance: Pump Cavitation Reliability
section: Suction pressure and flow instability
source_url: https://www.energy.gov/sites/default/files/2014/05/f16/pump.pdf
asset_focus: centrifugal cooling pump
failure_mode: cavitation suction restriction impeller damage
maintenance_signal: flow_m3_h pressure_bar vibration_mm_s
---
Centrifugal pumps need enough inlet pressure to avoid cavitation. Low flow with falling suction pressure can damage impellers, increase vibration, stress bearings, and shorten pump life. For blast furnace cooling service, the safest response is to check suction restrictions, air ingress, seal leakage, and standby pump readiness when flow drops below the stable operating band.

---
equipment_id: bf-pump-07
source_type: sop
title: External Guidance: Pump Predictive Maintenance
section: Predictive inspections before failure
source_url: https://www.energy.gov/sites/default/files/2014/05/f16/pump.pdf
asset_focus: pumping system maintenance
failure_mode: efficiency loss wear lubrication contamination
maintenance_signal: flow_m3_h pressure_bar torque_nm
---
Pump maintenance should combine routine preventive work with predictive checks such as vibration review, lubrication inspection, pressure trend review, and capacity checks. Efficiency and capacity can decline before a pump fails, so the copilot should recommend scheduled inspection when pressure, flow, torque, and vibration trend in the wrong direction even if the pump is still running.

---
equipment_id: conv-gearbox-03
source_type: manual
title: External Guidance: Gearbox Contamination Control
section: Keep gear oil sealed and filtered
source_url: https://reliabilityweb.com/articles/entry/precision_gear_lubrication_building_a_foundation_for_reliability2
asset_focus: conveyor gearbox lubrication
failure_mode: oil contamination particle ingress moisture ingress
maintenance_signal: oil_particles_ppm vibration_mm_s tool_wear_min
---
Gearbox reliability depends on keeping lubricant clean during normal operation and maintenance. Particle ingress, moisture, open breathers, and poor oil handling can accelerate gear and bearing wear. When oil particle count rises with vibration, inspect breathers, seals, sample ports, oil-transfer practice, and filtration before approving high-load conveyor operation.

---
equipment_id: conv-gearbox-03
source_type: failure_report
title: External Guidance: Machine Noise and Wear Clues
section: Bearings, gears, lubrication, and imbalance
source_url: https://www.osha.gov/sites/default/files/2018-12/fy14_sh-26283-sh4_Construction_Noise_and_Hearing_Loss_Prevention_Train_the_Trainer_Binder.pdf
asset_focus: gearbox and rotating equipment
failure_mode: worn bearings gear tooth wear poor lubrication imbalance
maintenance_signal: vibration_mm_s oil_particles_ppm speed_rpm
---
Rising machine noise or vibration can be caused by worn bearings, chipped or worn gear teeth, looseness, poor lubrication, imbalance, or blocked airflow. In the conveyor gearbox, vibration should be read together with oil particle count and inspection results so the plan can separate contamination cleanup from deeper gear or bearing damage.

