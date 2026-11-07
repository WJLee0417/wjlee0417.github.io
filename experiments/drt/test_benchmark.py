import copy
import math
import types
import unittest
import numpy as np
from benchmark import arrival_time, audit, exact_reference


def fixture():
    p = types.SimpleNamespace(N=2, vehicle=2, destination=2, Q=2, U=5,
        t=np.array([[0.,1.,1.],[1.,0.,1.],[1.,1.,0.]]),
        c_vhl=np.array([[0.,1.,1.],[1.,0.,1.],[1.,1.,0.]]),
        c_user=np.array([[0.,1.]]), s=np.array([0.,1.,3.]), e=np.array([3.]), l=np.array([4.]))
    c = types.SimpleNamespace(id=1,o=1,p=1,d=2,demand=1)
    route = types.SimpleNamespace(idx=1,stops=[types.SimpleNamespace(node=1,is_pickup=True,cust=c),types.SimpleNamespace(node=2,is_pickup=False,cust=c)])
    sol = types.SimpleNamespace(routes=[route],unassigned=set(),cost=3.)
    return p,sol,{1:{"o":1,"d":2,"demand":1}}


class ModelContractTests(unittest.TestCase):
    def test_arrival_in_window_can_finish_service_after_window(self):
        p,s,e=fixture()
        end,arrivals=arrival_time(p,s.routes[0])
        self.assertEqual(arrivals,[1.,3.])
        self.assertEqual(end,7.)
        self.assertTrue(audit(p,s,e)["feasible"])

    def test_early_arrival_waits_before_service(self):
        p,s,e=fixture();p.e[0]=10;p.l[0]=10
        end,arrivals=arrival_time(p,s.routes[0])
        self.assertEqual(arrivals[-1],10.)
        self.assertEqual(end,14.)

    def test_late_arrival_is_rejected(self):
        p,s,e=fixture();p.e[0]=0;p.l[0]=2
        self.assertTrue(math.isinf(arrival_time(p,s.routes[0])[0]))
        self.assertIn("destination arrival time window",audit(p,s,e)["issues"])

    def test_capacity_is_not_relaxed(self):
        p,s,e=fixture();p.Q=0
        self.assertTrue(math.isinf(arrival_time(p,s.routes[0])[0]))
        self.assertIn("vehicle capacity",audit(p,s,e)["issues"])

    def test_complete_coverage_is_required(self):
        p,s,e=fixture();e[2]={"o":1,"d":2,"demand":1};s.unassigned={2}
        a=audit(p,s,e)
        self.assertFalse(a["feasible"])
        self.assertEqual(a["missing_groups"],[2])
        self.assertIsNone(a["objective"])

    def test_duplicate_pickup_drop_is_not_counted_as_success(self):
        p,s,e=fixture();s.routes[0].stops*=2;p.l[0]=100
        self.assertIn("duplicate/split customer service",audit(p,s,e)["issues"])

    def test_incorrect_boarding_metadata_is_detected(self):
        p,s,e=fixture();s.routes[0].stops[0].cust.p=2
        self.assertFalse(audit(p,s,e)["feasible"])

    def test_reported_cost_must_match_actual_stop_cost(self):
        p,s,e=fixture();s.cost=2
        self.assertIn("reported objective differs from independent objective",audit(p,s,e)["issues"])

    def test_exact_reference_covers_assignment_and_order(self):
        p,s,e=fixture();reference=exact_reference(p,e)
        self.assertEqual(reference["objective"],3.)
        self.assertEqual(len(reference["routes"]),1)


if __name__=="__main__":
    unittest.main()
